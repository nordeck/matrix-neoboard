/*
 * Copyright 2023 Nordeck IT + Consulting GmbH
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
import { nanoid } from '@reduxjs/toolkit';
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
  STATE_EVENT_WHITEBOARD_SESSIONS,
  WhiteboardSession,
  WhiteboardSessions,
  isNotExpired,
  isValidWhiteboardSessionsStateEvent,
} from '../../../model';
import { Session, SessionManager } from './types';

type SessionState = { userId: string } & WhiteboardSession;

export class SessionManagerImpl implements SessionManager {
  private readonly logger = getLogger('SessionManager');
  private readonly destroySubject = new Subject<void>();
  private readonly leaveSubject = new Subject<void>();
  private readonly sessionJoinedSubject = new Subject<Session>();
  private readonly sessionLeftSubject = new Subject<Session>();
  private sessions: SessionState[] = [];
  private joinState: { whiteboardId: string; sessionId: string } | undefined;

  constructor(
    private readonly widgetApiPromise: Promise<WidgetApi> | WidgetApi,
    private readonly sessionTimeout = 30 * 60 * 1000,
    private readonly cleanupInterval = 10 * 1000,
  ) {}

  getSessionId(): string | undefined {
    return this.joinState?.sessionId;
  }

  getSessions(): Session[] {
    return this.sessions.map(({ sessionId, userId }) => ({
      sessionId,
      userId,
    }));
  }

  observeSessionJoined(): Observable<Session> {
    return this.sessionJoinedSubject;
  }

  observeSessionLeft(): Observable<Session> {
    return this.sessionLeftSubject;
  }

  async join(whiteboardId: string): Promise<{ sessionId: string }> {
    if (this.joinState) {
      await this.leave();
    }

    const sessionId = nanoid();
    this.joinState = { sessionId, whiteboardId };

    this.logger.log(
      `Joining whiteboard ${whiteboardId} as session ${sessionId}`,
    );

    // Handle session events
    from(Promise.resolve(this.widgetApiPromise))
      .pipe(
        switchMap((widgetApi) =>
          widgetApi.observeStateEvents(STATE_EVENT_WHITEBOARD_SESSIONS),
        ),
        filter(isValidWhiteboardSessionsStateEvent),
        takeUntil(this.destroySubject),
        takeUntil(this.leaveSubject),
      )
      .subscribe((whiteboardSessions) => {
        this.handleWhiteboardSessionsEvent(whiteboardSessions);
      });

    // Cleanup expired sessions
    interval(this.cleanupInterval)
      .pipe(takeUntil(this.destroySubject), takeUntil(this.leaveSubject))
      .subscribe(() => {
        this.sessions
          .filter((s) => !isNotExpired(s))
          .forEach((session) => {
            this.logger.log(
              `Session ${session.sessionId} by ${session.userId} expired from whiteboard ${session.whiteboardId}`,
            );
            this.removeSession(session);
          });
      });

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
    await this.refreshOwnSession(whiteboardId, sessionId);

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

    while (this.sessions.length > 0) {
      this.removeSession(this.sessions[0]);
    }

    await this.removeOwnSession(whiteboardId, sessionId);
  }

  destroy(): void {
    this.destroySubject.next();
    this.sessionJoinedSubject.complete();
    this.sessionLeftSubject.complete();
  }

  private handleWhiteboardSessionsEvent(
    event: StateEvent<WhiteboardSessions>,
  ): void {
    const userId = event.state_key;
    const eventSessions = event.content.sessions.filter(isNotExpired);

    // Remove sessions
    const sessionsToRemove = this.sessions.filter(
      (existingSession) =>
        existingSession.userId === userId &&
        !eventSessions.find(
          (s) =>
            s.sessionId === existingSession.sessionId &&
            s.whiteboardId === existingSession.whiteboardId,
        ),
    );

    sessionsToRemove
      .filter(({ sessionId }) => sessionId !== this.getSessionId())
      .forEach((session) => this.removeSession(session));

    // Update sessions
    this.sessions = this.sessions.map((existingSession) => {
      if (existingSession.userId === userId) {
        const updatedSession = eventSessions.find(
          (s) =>
            s.sessionId === existingSession.sessionId &&
            s.whiteboardId === existingSession.whiteboardId,
        );
        if (updatedSession) {
          return { userId, ...updatedSession };
        }
      }
      return existingSession;
    });

    // Add sessions
    const sessionsToAdd = eventSessions.filter((newSession) => {
      return !this.sessions.find(
        (s) =>
          s.userId === userId &&
          s.sessionId === newSession.sessionId &&
          s.whiteboardId === newSession.whiteboardId,
      );
    });

    sessionsToAdd
      .filter(({ sessionId }) => sessionId !== this.getSessionId())
      .forEach((newSession) =>
        this.addSession({
          userId,
          ...newSession,
        }),
      );
  }

  private addSession(session: SessionState): void {
    const { userId, sessionId, whiteboardId } = session;

    this.logger.log(
      `Session ${sessionId} by ${userId} joined whiteboard ${whiteboardId}`,
    );

    this.sessions = [...this.sessions, session];
    this.sessionJoinedSubject.next({ sessionId, userId });
  }

  private removeSession(session: SessionState): void {
    const { userId, sessionId, whiteboardId } = session;

    this.logger.log(
      `Session ${sessionId} by ${userId} left whiteboard ${whiteboardId}`,
    );

    this.sessions = this.sessions.filter((s) => s !== session);
    this.sessionLeftSubject.next({ sessionId, userId });
  }

  private async removeOwnSession(
    whiteboardId: string,
    sessionId: string,
  ): Promise<void> {
    this.logger.log(
      `Removing own session ${sessionId} from whiteboard ${whiteboardId}`,
    );

    await this.patchOwnSessions((whiteboardSessions) => ({
      ...whiteboardSessions,
      sessions: whiteboardSessions.sessions.filter(
        (s) => s.sessionId !== sessionId || s.whiteboardId !== whiteboardId,
      ),
    }));
  }

  private async refreshOwnSession(
    whiteboardId: string,
    sessionId: string,
  ): Promise<void> {
    this.logger.log(
      `Updating own session ${sessionId} for whiteboard ${whiteboardId}`,
    );

    await this.patchOwnSessions((whiteboardSessions) => ({
      ...whiteboardSessions,
      sessions: [
        ...whiteboardSessions.sessions.filter(
          (s) => s.sessionId !== sessionId || s.whiteboardId !== whiteboardId,
        ),
        {
          sessionId,
          whiteboardId,
          expiresTs: Date.now() + this.sessionTimeout,
        },
      ],
    }));
  }

  private async patchOwnSessions(
    patchFn: (patchOwnSessions: WhiteboardSessions) => WhiteboardSessions,
  ): Promise<void> {
    const widgetApi = await this.widgetApiPromise;
    const { userId } = widgetApi.widgetParameters;

    if (!userId) {
      throw new Error('Unknown user id');
    }

    const sessionsEvent = await widgetApi.receiveSingleStateEvent(
      STATE_EVENT_WHITEBOARD_SESSIONS,
      userId,
    );

    const whiteboardSessions =
      sessionsEvent && isValidWhiteboardSessionsStateEvent(sessionsEvent)
        ? clone(sessionsEvent.content)
        : { sessions: [] };

    // Filter out all sessions that are expired
    whiteboardSessions.sessions =
      whiteboardSessions.sessions.filter(isNotExpired);
    const updatedWhiteboardSessions = patchFn(whiteboardSessions);

    // Check if there are changes, to avoid sending the same event
    if (!isEqual(updatedWhiteboardSessions, sessionsEvent?.content)) {
      try {
        await widgetApi.sendStateEvent(
          STATE_EVENT_WHITEBOARD_SESSIONS,
          updatedWhiteboardSessions,
          { stateKey: userId },
        );
      } catch (ex) {
        this.logger.error('Error while sending whiteboard sessions', ex);
      }
    }
  }
}
