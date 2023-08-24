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
import { Whiteboard } from '../model';
import { StoreType } from '../store';
import {
  SessionManager,
  SessionManagerImpl,
  SignalingChannel,
  ToDeviceMessageSignalingChannel,
} from './communication';
import { WhiteboardInstance, WhiteboardManager } from './types';
import { WhiteboardInstanceImpl } from './whiteboardInstanceImpl';

export class WhiteboardManagerImpl implements WhiteboardManager {
  private activeWhiteboard: WhiteboardInstanceImpl | undefined = undefined;

  constructor(
    private readonly store: StoreType,
    private readonly widgetApiPromise: Promise<WidgetApi>,
    private readonly sessionManager: SessionManager,
    private readonly signalingChannel: SignalingChannel,
  ) {}

  selectActiveWhiteboardInstance(whiteboardEvent: StateEvent<Whiteboard>) {
    if (this.activeWhiteboard?.getWhiteboardId() !== whiteboardEvent.event_id) {
      this.activeWhiteboard?.destroy();
      this.activeWhiteboard = WhiteboardInstanceImpl.create(
        this.store,
        this.widgetApiPromise,
        this.sessionManager,
        this.signalingChannel,
        whiteboardEvent,
      );
    }
  }

  getActiveWhiteboardInstance(): WhiteboardInstance | undefined {
    return this.activeWhiteboard;
  }
}

export function createWhiteboardManager(
  store: StoreType,
  widgetApiPromise: Promise<WidgetApi>,
): WhiteboardManager {
  // We never destroy these, but this is fine
  const signalingChannel = new ToDeviceMessageSignalingChannel(
    widgetApiPromise,
  );
  const sessionManager = new SessionManagerImpl(widgetApiPromise);

  return new WhiteboardManagerImpl(
    store,
    widgetApiPromise,
    sessionManager,
    signalingChannel,
  );
}
