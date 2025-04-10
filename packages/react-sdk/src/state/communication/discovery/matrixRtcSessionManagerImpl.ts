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
import { SessionState } from './sessionManagerImpl';
import { Session, SessionManager } from './types';

export class MatrixRtcSessionManagerImpl implements SessionManager {
  private readonly logger = getLogger('RTCSessionManager');
  private readonly destroySubject = new Subject<void>();
  private readonly leaveSubject = new Subject<void>();
  private readonly sessionJoinedSubject = new Subject<Session>();
  private readonly sessionLeftSubject = new Subject<Session>();
  // This subject is used to track the state of all sessions, allowing us to
  // detect sessions and manage their lifecycle, including adding expiration dates.
  private readonly sessionSubject = new Subject<SessionState>();
  private sessions: StateEvent<RTCSessionEventContent>[] = [];
  private joinState: { whiteboardId: string; sessionId: string } | undefined;

  constructor(
    private readonly widgetApiPromise: Promise<WidgetApi> | WidgetApi,
    private readonly sessionTimeout = DEFAULT_RTC_EXPIRE_DURATION,
  ) {}

  getSessionId(): string | undefined {
    return this.joinState?.sessionId;
  }

  getSessions(): Session[] {
    return this.sessions.map(({ state_key, sender }) => ({
      sessionId: state_key,
      userId: sender,
    }));
  }

  observeSessionJoined(): Observable<Session> {
    return this.sessionJoinedSubject;
  }

  observeSessionLeft(): Observable<Session> {
    return this.sessionLeftSubject;
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
      .subscribe();

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

    await this.removeOwnSession(whiteboardId, sessionId);
  }

  destroy(): void {
    this.destroySubject.next();
    this.sessionJoinedSubject.complete();
    this.sessionSubject.complete();
    this.sessionLeftSubject.complete();
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
      expiresTs: this.getExpiresTs(event),
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

  private async removeOwnSession(
    whiteboardId: string,
    sessionId: string,
  ): Promise<void> {
    this.logger.debug(
      `Removing own session ${sessionId} for whiteboard ${whiteboardId}`,
    );

    await this.endRtcSession(sessionId);
  }

  private async refreshOwnSession(sessionId: string): Promise<void> {
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

      const updatedSession: RTCSessionEventContent = {
        ...baseSession,
        expires,
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

  private getExpiresTs(event: StateEvent<RTCSessionEventContent>): number {
    if (event.content.expires) {
      return event.content.expires;
    }

    if (event.content.created_ts) {
      return event.content.created_ts + this.sessionTimeout;
    }

    return event.origin_server_ts + this.sessionTimeout;
  }
}
