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

import { WidgetApi } from '@matrix-widget-toolkit/api';
import {
  filter,
  from,
  map,
  Observable,
  ReplaySubject,
  Subject,
  switchMap,
  takeUntil,
} from 'rxjs';
import {
  ConnectionSignaling,
  isValidConnectionSignalingMessage,
  TO_DEVICE_MESSAGE_CONNECTION_SIGNALING,
} from '../../../model';
import { SignalingChannel } from './types';

export class ToDeviceMessageSignalingChannel implements SignalingChannel {
  // A replay subject is used here, as the other peer might already starts
  // sending signaling messages once it discovers the peer while the own peer
  // is not yet listening. Therefore we always keep a backlog of the recent
  // signaling messages to dispatch them once we start listening.
  private readonly signalingSubject = new ReplaySubject<{
    sender: string;
    sessionId: string;
    connectionId: string;
    description?: RTCSessionDescription;
    candidates?: (RTCIceCandidate | null)[];
  }>(Infinity, this.timeout);
  private readonly destroySubject = new Subject<void>();

  constructor(
    private readonly widgetApiPromise: Promise<WidgetApi> | WidgetApi,
    private readonly timeout: number = 10000,
    // TODO: Encryption for to device messages is disabled for now, see the
    // caveats described in the sendToDevice function below
    private readonly encryption: boolean = false
  ) {
    from(Promise.resolve(widgetApiPromise))
      .pipe(
        takeUntil(this.destroySubject),
        switchMap((widgetApi) =>
          widgetApi.observeToDeviceMessages(
            TO_DEVICE_MESSAGE_CONNECTION_SIGNALING
          )
        ),
        // If we expect encryption, only process events that are encrypted!
        filter(({ encrypted }) => encrypted || !this.encryption),
        filter(isValidConnectionSignalingMessage)
      )
      .subscribe(({ sender, content }) => {
        const {
          sessionId,
          connectionId,
          candidates: candidatesJson,
          description: descriptionJson,
        } = content;
        const description = descriptionJson
          ? new RTCSessionDescription(descriptionJson)
          : undefined;
        const candidates = candidatesJson
          ? candidatesJson.map((c) => (c ? new RTCIceCandidate(c) : null))
          : undefined;

        this.signalingSubject.next({
          sender,
          sessionId,
          connectionId,
          description,
          candidates,
        });
      });
  }

  async sendCandidates(
    userId: string,
    sessionId: string,
    connectionId: string,
    candidates: (RTCIceCandidate | null)[]
  ): Promise<void> {
    this.sendToDevice<ConnectionSignaling>(
      TO_DEVICE_MESSAGE_CONNECTION_SIGNALING,
      userId,
      {
        sessionId,
        connectionId,
        candidates: candidates.map((c) => c?.toJSON() ?? null),
      }
    );
  }

  async sendDescription(
    userId: string,
    sessionId: string,
    connectionId: string,
    description: RTCSessionDescription
  ): Promise<void> {
    this.sendToDevice<ConnectionSignaling>(
      TO_DEVICE_MESSAGE_CONNECTION_SIGNALING,
      userId,
      {
        sessionId,
        connectionId,
        description: description.toJSON(),
      }
    );
  }

  observeSignaling(
    userId: string,
    sessionId: string,
    connectionId: string
  ): Observable<{
    description?: RTCSessionDescription | undefined;
    candidates?: (RTCIceCandidate | null)[] | undefined;
  }> {
    return this.signalingSubject.pipe(
      filter(
        (e) =>
          e.sender === userId &&
          e.sessionId === sessionId &&
          e.connectionId === connectionId
      ),
      map(({ candidates, description }) => ({ candidates, description }))
    );
  }

  destroy(): void {
    this.destroySubject.next();
    this.signalingSubject.complete();
  }

  private async sendToDevice<T extends object>(
    eventType: string,
    userId: string,
    content: T
  ): Promise<void> {
    const widgetApi = await this.widgetApiPromise;

    // If we use encryption, we will not be able to send messages to our own
    // device. See https://github.com/matrix-org/matrix-js-sdk/blob/develop/src/crypto/olmlib.ts#L260-L276
    // This means that we can not connect to other tabs in the same browser
    // session, because they use the same login / device. This does not apply to
    // different logins / browser sessions / devices of the same user.
    //
    // We could create a workaround though, by checking if we would send the
    // message to our own device id and then fallback to using a broadcast
    // channel instead: https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API
    // A broadcast channel allows us to communicate with other tabs in the same
    // browser session.
    // Note that the current code does not have access to device ids, therefore
    // this is not yet implemented.

    // TODO: Right now the StopGapWidgetDriver uses the wrong message format
    // for encrypted messages. It misses to correctly wrap the content into
    // an object with a type. See https://github.com/matrix-org/matrix-react-sdk/blob/develop/src/stores/widgets/StopGapWidgetDriver.ts#L257-L293
    // Therefore we special case the logic here. Element Call is using a similar
    // workaround and sends to different payloads: https://github.com/matrix-org/matrix-js-sdk/blob/develop/src/webrtc/call.ts#L2337-L2361
    // We created an issue to track the problem: https://github.com/vector-im/element-web/issues/24470
    const payload = this.encryption ? { type: eventType, content } : content;

    await widgetApi.sendToDeviceMessage(eventType, this.encryption, {
      [userId]: {
        // TODO: We don't have access to deviceIds in widgets, therefore we
        // can't directly send message to the right device :(
        // The Element Call widget does this, but it is special cased inside of
        // Element Web to get access to the deviceId.
        // In case this ever gets fixed, we can target signaling messages
        // directly to the correct device by including a device id in the
        // whiteboard sessions event.
        // See: https://github.com/matrix-org/matrix-spec-proposals/pull/3819/files#r1099833846
        '*': payload,
      },
    });
  }
}
