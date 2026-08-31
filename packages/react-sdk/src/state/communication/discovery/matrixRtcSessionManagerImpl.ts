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

import {
  RoomEvent,
  WidgetApi,
  isRoomEventCurrentlySticky,
} from '@matrix-widget-toolkit/api';
import { nanoid } from '@reduxjs/toolkit';
import isError from 'lodash/isError';
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
  timer,
} from 'rxjs';
import {
  ROOM_EVENT_4143_RTC_MEMBER,
  RtcMember,
  RtcMemberJoin,
  RtcMemberLeave,
  Transport,
  isLivekitTransport,
  isRtcMemberJoinEvent,
  isRtcMemberLeaveEvent,
  isValidWhiteboardRtcMemberEvent,
} from '../../../model';

import { matrixRtcParticipantIdentity } from '../../../lib';
import { SessionManager } from './types';

export type MatrixRtcSession = {
  userId: string;
  sessionId: string;
  memberId: string;
  livekitTransport: { livekitServiceUrl: string };
};

export class MatrixRtcSessionManagerImpl implements SessionManager<MatrixRtcSession> {
  private readonly logger = getLogger('MatrixRtcSessionManager');
  private readonly destroySubject = new Subject<void>();
  private readonly leaveSubject = new Subject<void>();
  private readonly sessionJoinedSubject = new Subject<MatrixRtcSession>();
  private readonly sessionLeftSubject = new Subject<MatrixRtcSession>();
  private readonly stickyDurationMs: number = 3600000;

  private sessions: MatrixRtcSession[] = [];
  private joinState:
    | {
        whiteboardId: string;
        sessionId: string;
        userId: string;
        deviceId: string;
        memberId: string;
      }
    | undefined;
  /**
   * Holds remove membership event delay id.
   * Is undefined is homeserver doesn't support delayed events.
   * Is assigned undefined if cannot restart a delayed event with this id.
   */
  private removeSessionDelayId?: string;

  constructor(
    private readonly widgetApiPromise: Promise<WidgetApi> | WidgetApi,
    private readonly removeSessionDelay: number = 8000,
  ) {}

  getSessionId(): string | undefined {
    return this.joinState?.sessionId;
  }

  /** Gets a list of all active sessions, including the own session. */
  getSessions(): MatrixRtcSession[] {
    return this.sessions.map(
      ({
        userId,
        sessionId,
        memberId,
        livekitTransport: { livekitServiceUrl },
      }) => ({
        userId,
        sessionId,
        memberId,
        livekitTransport: {
          livekitServiceUrl,
        },
      }),
    );
  }

  /**
   * Is not part of MatrixRtcSessionManager type. Is used in tests only.
   */
  getRemoveSessionDelayId(): string | undefined {
    return this.removeSessionDelayId;
  }

  /**
   * Observes new sessions that joined the current whiteboard.
   * Is also triggered for the own session.
   */
  observeSessionJoined(): Observable<MatrixRtcSession> {
    return this.sessionJoinedSubject;
  }

  /**
   * Observes sessions that left the current whiteboard, like expired
   * sessions.
   * Is also triggered for the own session.
   */
  observeSessionLeft(): Observable<MatrixRtcSession> {
    return this.sessionLeftSubject;
  }

  async join(whiteboardId: string): Promise<MatrixRtcSession> {
    if (this.joinState) {
      this.logger.debug('Already joined a whiteboard, must leave first.');
      await this.leave();
    }

    const widgetApi = await this.widgetApiPromise;
    const { userId, deviceId } = widgetApi.widgetParameters;

    if (!userId || !deviceId) {
      throw new Error('Unknown user id or device id ');
    }

    const memberId = nanoid();
    const sessionId = await matrixRtcParticipantIdentity(
      userId,
      deviceId,
      memberId,
    );

    this.logger.debug(
      `Joining whiteboard ${whiteboardId} as session ${sessionId}, member ${memberId}`,
    );

    const leftSet = new Set<string>();
    let ownJoinEventReceived: boolean = false;
    from(Promise.resolve(this.widgetApiPromise))
      .pipe(
        switchMap((widgetApi) =>
          widgetApi.observeRoomEvents(ROOM_EVENT_4143_RTC_MEMBER),
        ),
        filter(isRoomEventCurrentlySticky),
        filter(isValidWhiteboardRtcMemberEvent),
        filter((event) => {
          if (ownJoinEventReceived) {
            // do not filter events
            return true;
          }

          // filter out join events that are left until we get a join event for this session
          const { id: eventMemberId, membership } = event.content.member;
          if (membership === 'leave') {
            leftSet.add(eventMemberId);
            return true;
          } else {
            if (eventMemberId === memberId) {
              leftSet.clear();
              ownJoinEventReceived = true;
              return true;
            }

            return !leftSet.has(eventMemberId);
          }
        }),
        takeUntil(this.destroySubject),
        takeUntil(this.leaveSubject),
      )
      .subscribe(async (rtcMemberEvent) => {
        await this.handleRtcMemberEvent(rtcMemberEvent);
      });

    const transports: Transport[] = await widgetApi.getRtcTransports();
    const livekitTransport = getLivekitTransport(transports);

    await this.sendRtcMemberJoinEvent(memberId, whiteboardId, transports);
    await this.sendRtcMemberLeaveDelayedEvent(
      widgetApi,
      memberId,
      deviceId,
      whiteboardId,
    );
    await this.scheduleRestartRtcMemberLeaveDelayedEvent(widgetApi, memberId);

    this.joinState = { sessionId, whiteboardId, userId, deviceId, memberId };

    return { sessionId, userId, memberId, livekitTransport };
  }

  /**
   * Sends a remove membership delayed event, updates delay id.
   * @param widgetApi Widget API
   * @param memberId member id
   * @param deviceId device id
   * @param whiteboardId whiteboard id
   */
  private async sendRtcMemberLeaveDelayedEvent(
    widgetApi: WidgetApi,
    memberId: string,
    deviceId: string,
    whiteboardId: string,
  ): Promise<void> {
    this.logger.debug(
      `Sending RTC member leave delayed event for memberId: ${memberId}`,
    );

    let removeSessionDelayId: string | undefined;
    const rtcMemberLeave: RtcMemberLeave = {
      slot_id: `net.nordeck.whiteboard#${whiteboardId}`,
      member: {
        id: memberId,
        membership: 'leave',
        device_id: deviceId,
      },
      leave_reason: {
        code: 'delayed_leave',
      },
      msc4354_sticky_key: memberId,
    };
    try {
      ({ delay_id: removeSessionDelayId } =
        await widgetApi.sendDelayedRoomEvent(
          ROOM_EVENT_4143_RTC_MEMBER,
          rtcMemberLeave,
          this.removeSessionDelay,
          { stickyDurationMs: this.stickyDurationMs },
        ));

      this.logger.debug(
        `Sent RTC member leave delayed event for memberId: ${memberId}, removeSessionDelayId: ${removeSessionDelayId}`,
      );

      this.removeSessionDelayId = removeSessionDelayId;
    } catch (ex) {
      this.logger.error(
        'Could not send remove membership delayed event:',
        isError(ex) ? ex.message : ex,
      );
    }
  }

  /**
   * Restarts a delayed event periodically.
   * Invalidates a delay id if failed to restart.
   * @param widgetApi Widget API
   * @param memberId member id
   */
  private async scheduleRestartRtcMemberLeaveDelayedEvent(
    widgetApi: WidgetApi,
    memberId: string,
  ): Promise<void> {
    this.logger.debug(
      `Scheduling RTC member leave delayed event restart for memberId: ${memberId}`,
    );

    if (this.removeSessionDelayId) {
      interval(this.removeSessionDelay * 0.75)
        .pipe(
          takeUntil(this.destroySubject),
          takeUntil(this.leaveSubject),
          switchMap(() => {
            this.logger.debug(
              `Restarting membership leave delayed event: ${this.removeSessionDelayId}`,
            );
            if (this.removeSessionDelayId) {
              return widgetApi.updateDelayedEvent(
                this.removeSessionDelayId,
                UpdateDelayedEventAction.Restart,
              );
            } else {
              return Promise.resolve();
            }
          }),
        )
        .subscribe({
          error: (err) => {
            this.logger.error(
              `Could not restart delayed event: ${this.removeSessionDelayId}, error:`,
              isError(err) ? err.message : err,
            );
            this.removeSessionDelayId = undefined;
          },
        });
    }
  }

  async leave(): Promise<void> {
    if (!this.joinState) {
      return;
    }
    const { sessionId, whiteboardId, userId, deviceId, memberId } =
      this.joinState;

    this.joinState = undefined;
    this.leaveSubject.next();

    this.logger.log(
      `Leaving whiteboard ${whiteboardId} as session ${sessionId}`,
    );

    this.removeSession(sessionId, userId, memberId);

    await this.sendRtcMemberLeaveEvent(
      userId,
      deviceId,
      memberId,
      whiteboardId,
    );
    if (this.removeSessionDelayId) {
      const widgetApi = await this.widgetApiPromise;
      await widgetApi.updateDelayedEvent(
        this.removeSessionDelayId,
        UpdateDelayedEventAction.Cancel,
      );
      this.removeSessionDelayId = undefined;
    }
  }

  destroy(): void {
    this.logger.log(`Destroy session manager`);

    this.destroySubject.next();
    this.sessionJoinedSubject.complete();
    this.sessionLeftSubject.complete();
  }

  private async handleRtcMemberEvent(
    event: RoomEvent<RtcMember>,
  ): Promise<void> {
    const {
      sender,
      content: {
        member: { id: memberId, device_id: deviceId },
      },
    } = event;

    const sessionId = await matrixRtcParticipantIdentity(
      sender,
      deviceId,
      memberId,
    );

    if (event.content.member.membership === 'join') {
      this.logger.debug(
        'Handling RTC join event',
        event.event_id,
        event.sender,
        sessionId,
        new Date(event.origin_server_ts).toISOString(),
      );
    }

    if (isRtcMemberLeaveEvent(event)) {
      if (sessionId === this.joinState?.sessionId) {
        this.logger.log(`Leaving session ${sessionId}`);
        // Reset the join state
        this.joinState = undefined;
      }

      this.removeSession(sessionId, event.sender, memberId);
      return;
    } else if (isRtcMemberJoinEvent(event)) {
      if (sessionId === this.joinState?.sessionId) {
        const {
          content: {
            application: { whiteboard_id: whiteboardId },
            transports: { published: transports },
          },
        } = event;

        timer(this.stickyDurationMs * 0.9)
          .pipe(takeUntil(this.destroySubject), takeUntil(this.leaveSubject))
          .subscribe(async () => {
            this.logger.log(`Updating RTC member for memberId: ${memberId}`);

            await this.sendRtcMemberJoinEvent(
              memberId,
              whiteboardId,
              transports,
            );

            const widgetApi = await this.widgetApiPromise;

            if (this.removeSessionDelayId) {
              this.logger.log(
                `Cancelling RTC removeSessionDelayId: ${this.removeSessionDelayId}`,
              );
              await widgetApi.updateDelayedEvent(
                this.removeSessionDelayId,
                UpdateDelayedEventAction.Cancel,
              );
              this.removeSessionDelayId = undefined;
            }

            await this.sendRtcMemberLeaveDelayedEvent(
              widgetApi,
              memberId,
              deviceId,
              whiteboardId,
            );
          });
      }

      this.addSession(sessionId, memberId, event);
      return;
    }
  }

  private addSession(
    sessionId: string,
    memberId: string,
    event: RoomEvent<RtcMemberJoin>,
  ): void {
    const {
      sender,
      content: {
        application: { whiteboard_id },
        transports,
      },
    } = event;
    this.logger.debug(
      `Session ${sessionId} by ${sender} joined whiteboard ${whiteboard_id} event`,
      event,
      'member',
      memberId,
    );

    const livekitTransport = getLivekitTransport(transports.published);

    const session: MatrixRtcSession = {
      userId: sender,
      sessionId,
      memberId,
      livekitTransport,
    };
    this.sessions = [...this.sessions, session];

    this.logger.debug(
      'Sessions updated',
      JSON.stringify(this.sessions),
      'length',
      this.sessions.length,
    );

    this.sessionJoinedSubject.next({
      sessionId,
      userId: sender,
      memberId,
      livekitTransport,
    });
  }

  private removeSession(
    sessionId: string,
    userId: string,
    memberId: string,
  ): void {
    const session = this.sessions.find((s) => s.sessionId === sessionId);
    if (session === undefined) {
      return;
    }

    this.logger.debug(
      `Session ${sessionId} left whiteboard, user ${userId}, member: ${memberId}`,
    );

    this.sessions = this.sessions.filter((s) => s.sessionId !== sessionId);

    this.logger.debug(
      'Sessions updated',
      JSON.stringify(this.sessions),
      'length',
      this.sessions.length,
    );

    this.sessionLeftSubject.next({
      sessionId: session.sessionId,
      userId: session.userId,
      memberId: session.memberId,
      livekitTransport: session.livekitTransport,
    });
  }

  private async sendRtcMemberJoinEvent(
    memberId: string,
    whiteboardId: string,
    transports: Transport[],
  ): Promise<void> {
    this.logger.debug(
      `Sending RTC member join event for memberId: ${memberId}`,
    );

    const widgetApi = await this.widgetApiPromise;
    const { userId, deviceId } = widgetApi.widgetParameters;

    if (!userId || !deviceId) {
      throw new Error('Unknown user id or device id ');
    }

    const rtcMemberJoin: RtcMemberJoin = {
      slot_id: `net.nordeck.whiteboard#${whiteboardId}`,
      member: {
        id: memberId,
        membership: 'join',
        device_id: deviceId,
      },
      application: {
        type: 'net.nordeck.whiteboard',
        whiteboard_id: whiteboardId,
      },
      transports: {
        published: transports,
        can_subscribe: ['livekit'],
      },
      msc4354_sticky_key: memberId,
    };
    try {
      await widgetApi.sendRoomEvent(ROOM_EVENT_4143_RTC_MEMBER, rtcMemberJoin, {
        stickyDurationMs: this.stickyDurationMs,
      });
    } catch (ex) {
      this.logger.error('Error while sending RTC member join event', ex);
    }
  }

  private async sendRtcMemberLeaveEvent(
    userId: string,
    deviceId: string,
    memberId: string,
    whiteboardId: string,
  ): Promise<void> {
    this.logger.debug(
      `Sending RTC member leave event for userId: ${userId}, deviceId: ${deviceId}, memberId: ${memberId}`,
    );

    const widgetApi = await this.widgetApiPromise;

    const rtcMemberLeave: RtcMemberLeave = {
      slot_id: `net.nordeck.whiteboard#${whiteboardId}`,
      member: {
        id: memberId,
        membership: 'leave',
        device_id: deviceId,
      },
      leave_reason: {
        code: 'leave',
      },
      msc4354_sticky_key: memberId,
    };
    try {
      await widgetApi.sendRoomEvent(
        ROOM_EVENT_4143_RTC_MEMBER,
        rtcMemberLeave,
        { stickyDurationMs: this.stickyDurationMs },
      );
    } catch (ex) {
      this.logger.error('Error while sending RTC member leave event', ex);
    }
  }
}

function getLivekitTransport(transports: Transport[]): {
  livekitServiceUrl: string;
} {
  const transport = transports.find(isLivekitTransport);

  if (!transport) {
    throw new Error('Could not find livekit transport');
  }

  return {
    livekitServiceUrl: transport.livekit_service_url,
  };
}
