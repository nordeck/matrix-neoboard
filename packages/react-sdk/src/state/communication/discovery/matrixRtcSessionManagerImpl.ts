/*
 * Copyright 2025 Nordeck IT + Consulting GmbH
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { StateEvent, WidgetApi } from '@matrix-widget-toolkit/api';
import { clone, isEqual, isError } from 'lodash';
import { getLogger } from 'loglevel';
import { UpdateDelayedEventAction } from 'matrix-widget-api';
import {
  Observable,
  Subject,
  filter,
  from,
  interval,
  switchMap,
  takeUntil,
} from 'rxjs';
import {
  RTCSessionEventContent,
  STATE_EVENT_RTC_MEMBER,
  isRTCSessionNotExpired,
  newRTCSession,
} from '../../../model';
import {
  DEFAULT_RTC_EXPIRE_DURATION,
  isWhiteboardRTCSessionStateEvent,
} from '../../../model/matrixRtcSessions';
import {
  RTCFocus,
  getWellKnownFoci,
  makeFociPreferred,
} from './matrixRtcFocus';
import { SessionState } from './sessionManagerImpl';
import { MatrixRtcSessionManager, Session } from './types';

export class MatrixRtcSessionManagerImpl implements MatrixRtcSessionManager {
  private readonly logger = getLogger('RTCSessionManager');
  private readonly destroySubject = new Subject<void>();
  private readonly leaveSubject = new Subject<void>();
  private readonly sessionJoinedSubject = new Subject<Session>();
  private readonly sessionLeftSubject = new Subject<Session>();
  private readonly activeFocusSubject = new Subject<RTCFocus>();
  private readonly sessionSubject = new Subject<SessionState>();
  private sessions: StateEvent<RTCSessionEventContent>[] = [];
  private joinState: { whiteboardId: string; sessionId: string } | undefined;
  /*
   * MARK: memberFocus is currently left undefined until we work on focus updates
   * resulting from session membership changes
   **/
  private memberFocus: RTCFocus | undefined = undefined;
  private fociPreferred: RTCFocus[] = [];
  private wellKnownFoci: RTCFocus[] = [];
  private activeFocus: RTCFocus | undefined;
  /**
   * Holds remove membership event delay id.
   * Is undefined is homeserver doesn't support delayed events.
   * Is assigned undefined if cannot refresh a delayed event with this id.
   */
  private removeSessionDelayId?: string;

  constructor(
    private readonly widgetApiPromise: Promise<WidgetApi> | WidgetApi,
    private readonly sessionTimeout = DEFAULT_RTC_EXPIRE_DURATION,
    wellKnownPollingInterval = 60 * 1000,
    private readonly removeSessionDelay: number = 8000,
  ) {
    this.checkForWellKnownFoci().catch((error) => {
      this.logger.error('Failed to check for well-known foci:', error);
    });

    interval(wellKnownPollingInterval)
      .pipe(takeUntil(this.destroySubject))
      .subscribe(async () => {
        await this.checkForWellKnownFoci();
      });
  }

  getSessionId(): string | undefined {
    return this.joinState?.sessionId;
  }

  getSessions(): Session[] {
    return this.sessions.map(({ state_key, sender }) => ({
      sessionId: state_key,
      userId: sender,
    }));
  }

  getActiveFocus(): RTCFocus | undefined {
    return this.activeFocus;
  }

  /**
   * Is not part of MatrixRtcSessionManager type. Is used in tests only.
   */
  getRemoveSessionDelayId(): string | undefined {
    return this.removeSessionDelayId;
  }

  observeSessionJoined(): Observable<Session> {
    return this.sessionJoinedSubject;
  }

  observeSessionLeft(): Observable<Session> {
    return this.sessionLeftSubject;
  }

  observeActiveFocus(): Observable<RTCFocus> {
    return this.activeFocusSubject;
  }

  observeSession(): Observable<SessionState> {
    return this.sessionSubject;
  }

  async join(whiteboardId: string): Promise<{ sessionId: string }> {
    if (this.joinState) {
      this.logger.debug('Already joined a whiteboard, must leave first.');
      await this.leave();
    }

    const widgetApi = await this.widgetApiPromise;
    const { userId, deviceId } = widgetApi.widgetParameters;
    const sessionId = `_${userId}_${deviceId}`;

    this.joinState = { sessionId, whiteboardId };

    this.logger.debug(
      `Joining whiteboard ${whiteboardId} as session ${sessionId}`,
    );

    interval(this.sessionTimeout * 0.75)
      .pipe(
        takeUntil(this.destroySubject),
        takeUntil(this.leaveSubject),
        switchMap(() => this.refreshOwnSession(sessionId)),
      )
      .subscribe();

    await this.refreshOwnSession(sessionId);
    await this.scheduleRemoveMembershipDelayedEvent(widgetApi, sessionId);

    // Handle session events
    from(Promise.resolve(this.widgetApiPromise))
      .pipe(
        switchMap((widgetApi) =>
          widgetApi.observeStateEvents(STATE_EVENT_RTC_MEMBER),
        ),
        filter(isWhiteboardRTCSessionStateEvent),
        takeUntil(this.destroySubject),
        takeUntil(this.leaveSubject),
      )
      .subscribe(async (rtcSession) => {
        if (
          Object.keys(rtcSession.content).length === 0 &&
          rtcSession.state_key === sessionId
        ) {
          // refresh a membership event when event for this session is removed
          await this.refreshOwnSession(sessionId);

          if (!this.removeSessionDelayId || rtcSession.sender !== userId) {
            /**
             * Re-schedule if delay id is empty (failed to refresh a delayed event)
             *
             * Re-schedule if a remove membership event is sent by another user.
             * In this case a delayed state event is cancelled according to MSC4140.
             */
            await this.scheduleRemoveMembershipDelayedEvent(
              widgetApi,
              sessionId,
            );
          }
        } else {
          this.handleRTCSessionEvent(rtcSession);
        }
      });

    return { sessionId };
  }

  /**
   * Sends a remove membership delayed event, updates delay id.
   * Refreshes a delayed event periodically.
   * Invalidates a delay id if failed to refresh.
   * @param widgetApi Widget API
   * @param sessionId session id
   */
  private async scheduleRemoveMembershipDelayedEvent(
    widgetApi: WidgetApi,
    sessionId: string,
  ): Promise<void> {
    let removeSessionDelayId: string | undefined;
    try {
      ({ delay_id: removeSessionDelayId } =
        await widgetApi.sendDelayedStateEvent(
          STATE_EVENT_RTC_MEMBER,
          {},
          this.removeSessionDelay,
          {
            stateKey: sessionId,
          },
        ));
    } catch (ex) {
      this.logger.error(
        'Could not send remove membership delayed event:',
        isError(ex) ? ex.message : ex,
      );
    }

    if (removeSessionDelayId) {
      interval(this.removeSessionDelay * 0.75)
        .pipe(
          takeUntil(this.destroySubject),
          takeUntil(this.leaveSubject),
          switchMap(() =>
            widgetApi.updateDelayedEvent(
              removeSessionDelayId,
              UpdateDelayedEventAction.Restart,
            ),
          ),
        )
        .subscribe({
          error: (err) => {
            if (
              this.removeSessionDelayId &&
              this.removeSessionDelayId === removeSessionDelayId
            ) {
              this.removeSessionDelayId = undefined;
            }
            this.logger.error(
              'Could not refresh delayed event:',
              isError(err) ? err.message : err,
            );
          },
        });

      this.removeSessionDelayId = removeSessionDelayId;
    }
  }

  async leave(): Promise<void> {
    if (!this.joinState) {
      return;
    }
    const { sessionId, whiteboardId } = this.joinState;

    this.joinState = undefined;
    this.leaveSubject.next();

    this.logger.log(
      `Leaving whiteboard ${whiteboardId} as session ${sessionId}`,
    );

    const widgetApi = await this.widgetApiPromise;
    const { userId } = widgetApi.widgetParameters;

    if (userId) {
      this.removeSession(sessionId, userId);
    }

    await this.endRtcSession(sessionId);
    if (this.removeSessionDelayId) {
      widgetApi.updateDelayedEvent(
        this.removeSessionDelayId,
        UpdateDelayedEventAction.Cancel,
      );
      this.removeSessionDelayId = undefined;
    }
  }

  destroy(): void {
    this.destroySubject.next();
    this.sessionJoinedSubject.complete();
    this.sessionSubject.complete();
    this.sessionLeftSubject.complete();
    this.activeFocusSubject.complete();
  }

  private async checkForWellKnownFoci(): Promise<void> {
    this.logger.debug('Looking up the homeserver RTC foci');

    // Check for foci in .well-known/matrix/client
    const widgetApi = await this.widgetApiPromise;
    const domain = widgetApi.widgetParameters.userId?.replace(/^.*?:/, '');

    const foci = await getWellKnownFoci(domain);
    this.logger.debug('Found homeserver foci', JSON.stringify(foci));

    // There was a change in the homeserver's foci
    if (!isEqual(foci, this.wellKnownFoci)) {
      this.logger.debug('Homeserver foci changed');
      this.wellKnownFoci = foci;
      this.computeActiveFocus();
    } else {
      this.logger.debug('No new homeserver foci found');
    }
  }

  private computeActiveFocus() {
    this.logger.debug('Checking if a new active focus is required');

    this.fociPreferred = makeFociPreferred(
      this.memberFocus,
      this.wellKnownFoci,
    );

    // Check for a new active foci to change to
    const newActiveFocus = this.fociPreferred[0];
    if (!isEqual(this.activeFocus, newActiveFocus)) {
      this.activeFocus = newActiveFocus;
      this.activeFocusSubject.next(newActiveFocus);
    }
  }

  private handleRTCSessionEvent(
    event: StateEvent<RTCSessionEventContent>,
  ): void {
    const sessionId = event.state_key;
    const whiteboardId = event.content.call_id;

    this.logger.debug('Handling RTC event', JSON.stringify(event));

    this.sessionSubject.next({
      sessionId,
      userId: event.sender,
      expiresTs: event.content.expires,
      whiteboardId,
    });

    if (Object.keys(event.content).length === 0) {
      this.removeSession(sessionId, event.sender);
      return;
    }

    this.sessions = this.sessions.filter(isRTCSessionNotExpired);

    const existingSessionIndex = this.sessions.findIndex(
      (s) => s.state_key === sessionId && s.content.call_id === whiteboardId,
    );

    if (existingSessionIndex >= 0) {
      this.sessions[existingSessionIndex] = event;
    } else {
      if (sessionId !== this.getSessionId()) {
        this.addSession(event);
      } else {
        this.sessions.push(event);
      }
    }

    this.logger.debug('Sessions updated', JSON.stringify(this.sessions));
  }

  private addSession(session: StateEvent<RTCSessionEventContent>): void {
    const { sender, state_key } = session;

    this.logger.debug(
      `Session ${state_key} by ${sender} joined whiteboard ${session.content.call_id}`,
    );

    this.sessions = [...this.sessions, session];
    this.sessionJoinedSubject.next({ sessionId: state_key, userId: sender });
  }

  private removeSession(sessionId: string, userId: string): void {
    this.logger.debug(`Session ${sessionId} left whiteboard`);

    this.sessions = this.sessions.filter((s) => s.state_key !== sessionId);
    this.sessionLeftSubject.next({
      sessionId,
      userId,
    });
  }

  private async refreshOwnSession(
    sessionId: string | undefined,
  ): Promise<void> {
    const expires = Date.now() + this.sessionTimeout;
    const widgetApi = await this.widgetApiPromise;
    const { userId, deviceId } = widgetApi.widgetParameters;
    const { whiteboardId } = this.joinState ?? {};

    this.logger.debug(`Refreshing session ${sessionId}`);

    if (!userId || !deviceId || !whiteboardId) {
      // @todo this needs to be handled better so it bubbles up to the user
      this.logger.error(
        'Unknown user id or device id or whiteboard id when patching RTC session',
      );
      throw new Error('Unknown user id or device id or whiteboard id');
    }

    try {
      // Get the existing session event, if any
      const sessionEvent = (await widgetApi.receiveSingleStateEvent(
        STATE_EVENT_RTC_MEMBER,
        sessionId,
      )) as StateEvent<RTCSessionEventContent>;

      // Determine the base session object
      let baseSession: RTCSessionEventContent;

      if (
        sessionEvent &&
        Object.keys(sessionEvent.content).length !== 0 &&
        isWhiteboardRTCSessionStateEvent(sessionEvent)
      ) {
        // If a valid session exists, clone it
        baseSession = clone(sessionEvent.content);
      } else {
        // Otherwise create a new session event content
        baseSession = newRTCSession(deviceId, whiteboardId);
      }

      // make sure the livekit alias for foci is set to the current room
      const foci_preferred = this.fociPreferred.map((focus) => {
        if (focus.type === 'livekit') {
          return {
            ...focus,
            livekit_alias: widgetApi.widgetParameters.roomId,
          };
        }
        return focus;
      });

      const updatedSession: RTCSessionEventContent = {
        ...baseSession,
        expires,
        foci_preferred,
      };

      // Check if session has been modified compared to the original
      if (!isEqual(updatedSession, sessionEvent)) {
        await widgetApi.sendStateEvent(STATE_EVENT_RTC_MEMBER, updatedSession, {
          stateKey: `_${userId}_${deviceId}`,
        });
        this.logger.debug('RTC session sent', JSON.stringify(updatedSession));
      }
    } catch (ex) {
      this.logger.error('Error while sending RTC session', ex);
    }
  }

  private async endRtcSession(sessionId: string): Promise<void> {
    const widgetApi = await this.widgetApiPromise;
    const { userId, deviceId } = widgetApi.widgetParameters;

    this.logger.debug(
      'Ending RTC session with empty content in membership state',
      userId,
      deviceId,
      sessionId,
    );

    try {
      await widgetApi.sendStateEvent(
        STATE_EVENT_RTC_MEMBER,
        {},
        { stateKey: `_${userId}_${deviceId}` },
      );
    } catch (ex) {
      this.logger.error('Error while sending RTC session', ex);
    }
  }
}
