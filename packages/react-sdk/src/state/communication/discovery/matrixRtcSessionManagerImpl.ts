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
import { clone, isEqual } from 'lodash';
import { getLogger } from 'loglevel';
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
  LivekitFocus,
  RTCFocus,
  getWellKnownFoci,
  makeFociPreferred,
} from './matrixRtcFocus';
import { SessionState } from './sessionManagerImpl';
import { Session, SessionManager } from './types';

export class MatrixRtcSessionManagerImpl implements SessionManager {
  private readonly logger = getLogger('RTCSessionManager');
  private readonly destroySubject = new Subject<void>();
  private readonly leaveSubject = new Subject<void>();
  private readonly sessionJoinedSubject = new Subject<Session>();
  private readonly sessionLeftSubject = new Subject<Session>();
  private readonly preferredFociSubject = new Subject<RTCFocus[]>();
  private readonly activeFocusSubject = new Subject<RTCFocus>();
  private readonly sessionSubject = new Subject<SessionState>();
  private sessions: StateEvent<RTCSessionEventContent>[] = [];
  private joinState: { whiteboardId: string; sessionId: string } | undefined;
  private fociPreferred: RTCFocus[] = [];
  private wellKnownFoci: RTCFocus[] = [];
  private activeFocus: RTCFocus | undefined;
  private readonly fociPollingInterval = 60 * 1000;

  constructor(
    private readonly widgetApiPromise: Promise<WidgetApi> | WidgetApi,
    private readonly sessionTimeout = DEFAULT_RTC_EXPIRE_DURATION,
  ) {
    interval(this.fociPollingInterval)
      .pipe(takeUntil(this.destroySubject))
      .subscribe(async () => {
        await this.checkForWellKnownFoci();
      });

    this.observePreferredFoci()
      .pipe(takeUntil(this.destroySubject))
      .subscribe(async (foci) => {
        this.logger.debug('Preferred foci updated');

        const widgetApi = await this.widgetApiPromise;
        const roomId = widgetApi.widgetParameters.roomId ?? '';

        // TODO: Implement member focus logic later
        const memberFocus: LivekitFocus | undefined = undefined;

        this.fociPreferred = makeFociPreferred(
          memberFocus,
          foci as LivekitFocus[],
          roomId,
        );

        // Check for a new active foci to change to
        const newActiveFocus = this.fociPreferred[0];
        if (this.activeFocus !== newActiveFocus) {
          this.activeFocus = newActiveFocus;
          this.activeFocusSubject.next(newActiveFocus);
        }
      });

    this.checkForWellKnownFoci().catch((error) => {
      this.logger.error('Failed to check for well-known foci:', error);
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

  observeSessionJoined(): Observable<Session> {
    return this.sessionJoinedSubject;
  }

  observeSessionLeft(): Observable<Session> {
    return this.sessionLeftSubject;
  }

  observePreferredFoci(): Observable<RTCFocus[]> {
    return this.preferredFociSubject;
  }

  observeActiveFoci(): Observable<RTCFocus> {
    return this.activeFocusSubject;
  }

  observeSession(): Observable<SessionState> {
    return this.sessionSubject;
  }

  async checkForWellKnownFoci(): Promise<void> {
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
      this.preferredFociSubject.next(foci);
    } else {
      this.logger.debug('No new homeserver foci found');
    }
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
      .subscribe((rtcSession) => {
        this.handleRTCSessionEvent(rtcSession);
      });

    interval(this.sessionTimeout * 0.75)
      .pipe(
        takeUntil(this.destroySubject),
        takeUntil(this.leaveSubject),
        switchMap(() => this.refreshOwnSession(sessionId)),
      )
      .subscribe(() => {
        this.logger.debug('Session refreshed');
      });

    await this.refreshOwnSession(sessionId);

    return { sessionId };
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
  }

  destroy(): void {
    this.destroySubject.next();
    this.sessionJoinedSubject.complete();
    this.sessionSubject.complete();
    this.sessionLeftSubject.complete();
    this.activeFocusSubject.complete();
    this.preferredFociSubject.complete();
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
