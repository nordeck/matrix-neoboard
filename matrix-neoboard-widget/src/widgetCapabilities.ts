/*
 * Copyright 2022 Nordeck IT + Consulting GmbH
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
  extractWidgetParameters,
  STATE_EVENT_POWER_LEVELS,
  STATE_EVENT_ROOM_MEMBER,
} from '@matrix-widget-toolkit/api';
import {
  ROOM_EVENT_DOCUMENT_CHUNK,
  ROOM_EVENT_DOCUMENT_CREATE,
  ROOM_EVENT_DOCUMENT_SNAPSHOT,
  STATE_EVENT_DOCUMENT_PREVIEW,
  STATE_EVENT_ROOM_NAME,
  STATE_EVENT_WHITEBOARD,
  STATE_EVENT_WHITEBOARD_SESSIONS,
  TO_DEVICE_MESSAGE_CONNECTION_SIGNALING,
} from '@nordeck/matrix-neoboard-react-sdk';
import {
  EventDirection,
  MatrixCapabilities,
  WidgetApiFromWidgetAction,
  WidgetEventCapability,
} from 'matrix-widget-api';

const { userId } = extractWidgetParameters();

export const widgetCapabilities = [
  // Room Events
  WidgetEventCapability.forRoomEvent(
    EventDirection.Send,
    ROOM_EVENT_DOCUMENT_CREATE,
  ),
  WidgetEventCapability.forRoomEvent(
    EventDirection.Receive,
    ROOM_EVENT_DOCUMENT_CREATE,
  ),
  WidgetEventCapability.forRoomEvent(
    EventDirection.Send,
    ROOM_EVENT_DOCUMENT_SNAPSHOT,
  ),
  WidgetEventCapability.forRoomEvent(
    EventDirection.Receive,
    ROOM_EVENT_DOCUMENT_SNAPSHOT,
  ),
  WidgetEventCapability.forRoomEvent(
    EventDirection.Send,
    ROOM_EVENT_DOCUMENT_CHUNK,
  ),
  WidgetEventCapability.forRoomEvent(
    EventDirection.Receive,
    ROOM_EVENT_DOCUMENT_CHUNK,
  ),
  // State Events
  WidgetEventCapability.forStateEvent(
    EventDirection.Send,
    STATE_EVENT_DOCUMENT_PREVIEW,
    '',
  ),
  WidgetEventCapability.forStateEvent(
    EventDirection.Receive,
    STATE_EVENT_DOCUMENT_PREVIEW,
    '',
  ),
  WidgetEventCapability.forStateEvent(
    EventDirection.Send,
    STATE_EVENT_POWER_LEVELS,
    '',
  ),
  WidgetEventCapability.forStateEvent(
    EventDirection.Receive,
    STATE_EVENT_POWER_LEVELS,
    '',
  ),
  WidgetEventCapability.forStateEvent(
    EventDirection.Receive,
    STATE_EVENT_ROOM_MEMBER,
  ),

  WidgetEventCapability.forStateEvent(
    EventDirection.Send,
    STATE_EVENT_WHITEBOARD,
  ),
  WidgetEventCapability.forStateEvent(
    EventDirection.Receive,
    STATE_EVENT_WHITEBOARD,
  ),
  WidgetEventCapability.forStateEvent(
    EventDirection.Send,
    STATE_EVENT_WHITEBOARD_SESSIONS,
    // We only need to write the own state, but read state from everyone
    userId,
  ),
  WidgetEventCapability.forStateEvent(
    EventDirection.Receive,
    STATE_EVENT_WHITEBOARD_SESSIONS,
  ),
  WidgetEventCapability.forStateEvent(
    EventDirection.Receive,
    STATE_EVENT_ROOM_NAME,
  ),
  // To Device Events
  WidgetEventCapability.forToDeviceEvent(
    EventDirection.Send,
    TO_DEVICE_MESSAGE_CONNECTION_SIGNALING,
  ),
  WidgetEventCapability.forToDeviceEvent(
    EventDirection.Receive,
    TO_DEVICE_MESSAGE_CONNECTION_SIGNALING,
  ),
  // Others
  MatrixCapabilities.MSC3846TurnServers,
  WidgetApiFromWidgetAction.MSC4039UploadFileAction,
  WidgetApiFromWidgetAction.MSC4039DownloadFileAction,
];
