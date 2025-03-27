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
import { BehaviorSubject } from 'rxjs';
import { matrixRtcMode } from '../components/Whiteboard/constants';
import { Whiteboard } from '../model';
import { StoreType } from '../store';
import {
  RTCSessionManagerImpl,
  SessionManager,
  SessionManagerImpl,
  SignalingChannel,
  ToDeviceMessageSignalingChannel,
} from './communication';
import {
  ObservableBehaviorSubject,
  WhiteboardInstance,
  WhiteboardManager,
} from './types';
import { WhiteboardInstanceImpl } from './whiteboardInstanceImpl';

export class WhiteboardManagerImpl implements WhiteboardManager {
  private activeWhiteboardSubject = new BehaviorSubject<
    WhiteboardInstance | undefined
  >(undefined);

  constructor(
    private readonly store: StoreType,
    private readonly widgetApiPromise: Promise<WidgetApi>,
    private readonly sessionManager: SessionManager | undefined,
    private readonly signalingChannel: SignalingChannel | undefined,
  ) {}

  selectActiveWhiteboardInstance(
    whiteboardEvent: StateEvent<Whiteboard>,
    userId: string,
  ) {
    if (
      this.activeWhiteboardSubject.value?.getWhiteboardId() !==
      whiteboardEvent.event_id
    ) {
      this.activeWhiteboardSubject.value?.destroy();
      this.activeWhiteboardSubject.next(
        WhiteboardInstanceImpl.create(
          this.store,
          this.widgetApiPromise,
          this.sessionManager,
          this.signalingChannel,
          whiteboardEvent,
          userId,
        ),
      );
    }
  }

  public getActiveWhiteboardSubject(): ObservableBehaviorSubject<
    WhiteboardInstance | undefined
  > {
    return this.activeWhiteboardSubject;
  }

  getActiveWhiteboardInstance(): WhiteboardInstance | undefined {
    return this.activeWhiteboardSubject.value;
  }

  clear() {
    this.activeWhiteboardSubject.value?.destroy();
    this.activeWhiteboardSubject.next(undefined);
  }
}

export function createWhiteboardManager(
  store: StoreType,
  widgetApiPromise: Promise<WidgetApi>,
  disableRtc?: boolean,
): WhiteboardManager {
  const signalingChannel = !disableRtc
    ? new ToDeviceMessageSignalingChannel(widgetApiPromise)
    : undefined;

  const sessionManager = matrixRtcMode
    ? new RTCSessionManagerImpl(widgetApiPromise)
    : new SessionManagerImpl(widgetApiPromise);

  const sessionManagerToUse = disableRtc ? undefined : sessionManager;
  const signalingChannelToUse =
    disableRtc || matrixRtcMode ? undefined : signalingChannel;

  return new WhiteboardManagerImpl(
    store,
    widgetApiPromise,
    sessionManagerToUse,
    signalingChannelToUse,
  );
}
