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
  isValidRTCSessionStateEvent,
  newRTCSession,
} from '../../../model';
import { DEFAULT_RTC_EXPIRE_DURATION } from '../../../model/matrixRtcSessions';
import { Session, SessionManager } from './types';

export type SessionState = {
  whiteboardId: string;
  expiresTs: number;
} & Session;

export class RTCSessionManagerImpl implements SessionManager {
  private readonly logger = getLogger('RTCSessionManager');
  private readonly destroySubject = new Subject<void>();
  private readonly leaveSubject = new Subject<void>();
  private readonly sessionJoinedSubject = new Subject<Session>();
  private readonly sessionLeftSubject = new Subject<Session>();
  // This subject is used to track the state of all sessions, allowing us to
  // detect sessions and manage their lifecycle, including adding expiration dates.
  private readonly sessionSubject = new Subject<SessionState>();
  private sessions: RTCSessionEventContent[] = [];
  private joinState: { whiteboardId: string; sessionId: string } | undefined;

  constructor(
    private readonly widgetApiPromise: Promise<WidgetApi> | WidgetApi,
    private readonly sessionTimeout = DEFAULT_RTC_EXPIRE_DURATION,
  ) {}

  getSessionId(): string | undefined {
    return this.joinState?.sessionId;
  }

  getSessions(): Session[] {
    return this.sessions.map(({ session_id, user_id }) => ({
      sessionId: session_id,
      userId: user_id,
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
    console.error('LiveKit: join called', whiteboardId);
    if (this.joinState) {
      console.error('LiveKit: already joined a room, must leave first.');
      await this.leave();
    }

    const widgetApi = await this.widgetApiPromise;
    const { userId, deviceId } = widgetApi.widgetParameters;
    const sessionId = `_${userId}_${deviceId}`;

    this.joinState = { sessionId, whiteboardId };
    console.error('LiveKit: preparing join state...');

    this.logger.log(
      `Joining whiteboard ${whiteboardId} as session ${sessionId}`,
    );

    // Handle session events
    from(Promise.resolve(this.widgetApiPromise))
      .pipe(
        switchMap((widgetApi) =>
          widgetApi.observeStateEvents(STATE_EVENT_RTC_MEMBER),
        ),
        filter(isValidRTCSessionStateEvent),
        takeUntil(this.destroySubject),
        takeUntil(this.leaveSubject),
      )
      .subscribe((rtcSession) => {
        console.error('LiveKit: got session event', rtcSession);
        this.handleRTCSessionEvent(rtcSession);
      });

    /*
    // Cleanup expired sessions
    interval(this.cleanupInterval)
      .pipe(takeUntil(this.destroySubject), takeUntil(this.leaveSubject))
      .subscribe(() => {
        this.sessions
          .filter((s) => !isRTCSessionNotExpired(s))
          .forEach((session) => {
            this.logger.log(
              `Session ${session.session_id} by ${session.user_id} expired from whiteboard ${session.whiteboard_id}`,
            );
            this.removeSession({state_key: session.session_id, sender: session.user_id });
          });
      });
      */
    // Handle keeping the own session fresh or removing the session on leave /
    // switching to another whiteboard.
    interval(this.sessionTimeout * 0.75)
      .pipe(
        takeUntil(this.destroySubject),
        takeUntil(this.leaveSubject),
        switchMap(() => this.refreshOwnSession(whiteboardId, sessionId)),
      )
      .subscribe();

    // Write session initially
    console.error('LiveKit: refreshing own session...');
    await this.refreshOwnSession(whiteboardId, sessionId);

    return { sessionId };
  }

  async leave(): Promise<void> {
    if (!this.joinState) {
      return;
    }
    const { sessionId, whiteboardId } = this.joinState;
    console.error(
      'LiveKit: leaving whiteboard sesion...',
      sessionId,
      whiteboardId,
    );

    this.joinState = undefined;
    this.leaveSubject.next();

    this.logger.log(
      `Leaving whiteboard ${whiteboardId} as session ${sessionId}`,
    );

    const widgetApi = await this.widgetApiPromise;
    const { userId } = widgetApi.widgetParameters;

    console.error('LiveKit: removing session...');
    this.removeSession({ state_key: sessionId, sender: userId });

    console.error('LiveKit: removing own session...');
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
    const sessions = this.sessions.filter(isRTCSessionNotExpired);
    sessions.push(event.content);

    console.error('LiveKit: handling RTC event', JSON.stringify(event));

    this.sessionSubject.next({
      sessionId,
      userId: event.sender,
      expiresTs: event.content.expires!,
      whiteboardId: event.content.whiteboard_id,
    });

    if (Object.keys(event.content).length === 0) {
      this.removeSession(event);
    }

    // Update sessions
    this.sessions = this.sessions.map((existingSession) => {
      if (existingSession.session_id === sessionId) {
        const updatedSession = sessions.find(
          (s) =>
            s.session_id === existingSession.session_id &&
            s.whiteboard_id === existingSession.whiteboard_id,
        );
        if (updatedSession) {
          return { ...updatedSession };
        }
      }
      return existingSession;
    });

    // Add sessions
    const sessionsToAdd = sessions.filter((newSession) => {
      return !this.sessions.find(
        (s) =>
          s.session_id === newSession.session_id &&
          s.whiteboard_id === newSession.whiteboard_id,
      );
    });

    console.error('LiveKit: sessions to add', JSON.stringify(sessionsToAdd));

    sessionsToAdd
      .filter(({ session_id }) => session_id !== this.getSessionId())
      .forEach((newSession) =>
        this.addSession({
          ...newSession,
        }),
      );

    this.logger.error('LiveKit: THIS MESSAGE IS FROM LOGGER');
    console.error('LiveKit: sessions updated', JSON.stringify(this.sessions));
  }

  private addSession(session: RTCSessionEventContent): void {
    const { user_id, session_id, whiteboard_id } = session;

    this.logger.log(
      `Session ${session_id} by ${user_id} joined whiteboard ${whiteboard_id}`,
    );

    console.error('LiveKit: new session added', JSON.stringify(session));

    this.sessions = [...this.sessions, session];
    this.sessionJoinedSubject.next({ sessionId: session_id, userId: user_id });
  }

  private removeSession(
    event: Partial<StateEvent<RTCSessionEventContent>>,
  ): void {
    console.error('LiveKit: removeSession', JSON.stringify(event.state_key));

    this.logger.log(`Session ${event.state_key} left whiteboard`);

    this.sessions = this.sessions.filter(
      (s) => s.session_id !== event.state_key,
    );
    this.sessionLeftSubject.next({
      sessionId: event.state_key!,
      userId: event.sender!,
    });
  }

  private async removeOwnSession(
    whiteboardId: string,
    sessionId: string,
  ): Promise<void> {
    this.logger.log(
      `Removing own session ${sessionId} from whiteboard ${whiteboardId}`,
    );

    console.error('LiveKit: patching own session to remove it', whiteboardId);
    await this.endRtcSession(sessionId);
  }

  private async refreshOwnSession(
    whiteboardId: string,
    sessionId: string,
  ): Promise<void> {
    this.logger.log(
      `Updating own session ${sessionId} for whiteboard ${whiteboardId}`,
    );
    console.error('LiveKit: refreshOwnSession', sessionId);
    const expires = Date.now() + this.sessionTimeout;
    await this.patchOwnSession((rtcSession) => ({
      ...rtcSession,
      sessionId,
      whiteboardId,
      expires: expires,
      expiresTs: expires,
    }));
  }

  private async endRtcSession(sessionId: string): Promise<void> {
    const widgetApi = await this.widgetApiPromise;
    const { userId, deviceId } = widgetApi.widgetParameters;

    console.error(
      'LiveKit: ending RTC session...',
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

  /*
  private async patchOwnSession(
    patchFn: (patchOwnSession: Session) => Session,
  ): Promise<void> {
    const widgetApi = await this.widgetApiPromise;
    const { userId, deviceId } = widgetApi.widgetParameters;
    const { whiteboardId, sessionId } = this.joinState ?? {};

    console.error(
      'LiveKit: patching own session...',
      userId,
      deviceId,
      whiteboardId,
    );

    if (!userId || !deviceId || !whiteboardId) {
      // @todo this needs to be handled better so it bubbles up to the user
      throw new Error('Unknown user id or device id or whiteboard id');
    }

    const sessionEvent = (await widgetApi.receiveSingleStateEvent(
      STATE_EVENT_RTC_MEMBER,
      sessionId,
    )) as StateEvent<RTCSessionEventContent>;

    const session =
      sessionEvent &&
      Object.keys(sessionEvent.content).length !== 0 &&
      isValidRTCSessionStateEvent(sessionEvent)
        ? clone(sessionEvent.content)
        : newRTCSession(userId, deviceId, whiteboardId);

    // @todo this needs to be cleared up
    session.call_id = whiteboardId;

    if (isRTCSessionNotExpired(session)) {
      const updatedSession = patchFn({
        userId: session.user_id,
        sessionId: session.session_id,
        ...session,
      });

      if (!isEqual(updatedSession, sessionEvent?.content)) {
        try {
          await widgetApi.sendStateEvent(
            STATE_EVENT_RTC_MEMBER,
            updatedSession,
            { stateKey: `_${userId}_${deviceId}` },
          );
          console.error(
            'LiveKit: session refresh',
            JSON.stringify(updatedSession),
          );
        } catch (ex) {
          console.error("LiveKit: session refresh error while sending RTC session", ex);
          this.logger.error('Error while sending RTC session', ex);
        }
      }
    }
  }*/

  private async patchOwnSession(
    patchFn: (patchOwnSession: Session) => Session,
  ): Promise<void> {
    const widgetApi = await this.widgetApiPromise;
    const { userId, deviceId } = widgetApi.widgetParameters;
    const { whiteboardId, sessionId } = this.joinState ?? {};

    console.error(
      'LiveKit: patching own session...',
      userId,
      deviceId,
      whiteboardId,
    );

    if (!userId || !deviceId || !whiteboardId) {
      // @todo this needs to be handled better so it bubbles up to the user
      throw new Error('Unknown user id or device id or whiteboard id');
    }

    try {
      // Get the existing session event, if any
      const sessionEvent = (await widgetApi.receiveSingleStateEvent(
        STATE_EVENT_RTC_MEMBER,
        sessionId,
      )) as StateEvent<RTCSessionEventContent>;

      // Determine the base session object
      let baseSession: RTCSessionEventContent & {
        sessionId?: string;
        userId?: string;
      };

      if (
        sessionEvent &&
        Object.keys(sessionEvent.content).length !== 0 &&
        isValidRTCSessionStateEvent(sessionEvent)
      ) {
        // If a valid session exists, clone it
        baseSession = clone(sessionEvent.content);
      } else {
        // Otherwise create a new session
        baseSession = newRTCSession(userId, deviceId, whiteboardId);
      }

      // Always ensure call_id is set correctly
      baseSession.call_id = whiteboardId;

      // Convert to Session format for the patch function
      const sessionForPatch: Session = {
        userId: baseSession.user_id,
        sessionId: baseSession.session_id,
        ...baseSession, // Include any additional fields
      };

      // Apply the patch function to get updated values
      const patchedSession = patchFn(sessionForPatch);

      // Merge the patched fields back into the base session
      // This ensures all fields from the patch are applied
      const updatedSession = {
        ...baseSession,
        ...patchedSession,
        // Explicitly ensure critical fields remain correct
        user_id: userId,
        device_id: deviceId,
        whiteboard_id: whiteboardId,
        session_id: sessionId,
      };

      // Check if session has been modified compared to the original
      if (!isEqual(updatedSession, sessionEvent?.content)) {
        const finalSession: RTCSessionEventContent = {
          call_id: updatedSession.call_id,
          scope: updatedSession.scope,
          application: updatedSession.application,
          session_id: updatedSession.session_id!,
          whiteboard_id: updatedSession.whiteboard_id,
          user_id: updatedSession.user_id,
          device_id: updatedSession.device_id,
          createdTs: updatedSession.createdTs,
          expires: updatedSession.expires,
          focus_active: updatedSession.focus_active,
          foci_preferred: updatedSession.foci_preferred,
          // Include any additional fields that were patched
          ...(updatedSession as unknown as Record<string, unknown>),
        };

        await widgetApi.sendStateEvent(STATE_EVENT_RTC_MEMBER, finalSession, {
          stateKey: `_${userId}_${deviceId}`,
        });
        console.error('LiveKit: session refresh', JSON.stringify(finalSession));
      }
    } catch (ex) {
      console.error(
        'LiveKit: session refresh error while sending RTC session',
        ex,
      );
      this.logger.error('Error while sending RTC session', ex);
    }
  }
}
