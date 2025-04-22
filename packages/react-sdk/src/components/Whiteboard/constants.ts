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

import { getEnvironment } from '@matrix-widget-toolkit/mui';

export const infiniteCanvasMode =
  getEnvironment('REACT_APP_INFINITE_CANVAS') === 'true';

export const matrixRtcMode = getEnvironment('REACT_APP_RTC') === 'matrixrtc';

export const defaultTextSize = infiniteCanvasMode ? 16 : undefined;

export const whiteboardWidth = infiniteCanvasMode ? 19200 : 1920;
export const whiteboardHeight = infiniteCanvasMode ? 10800 : 1080;

export const gridCellSize = 20;

export const stickySize = 160;
export const stickyColor = '#ffefc1';

export const frameWidth = 1920;
export const frameHeight = 1080;

export const zoomStep = 0.1;
export const zoomMax = 1;
export const zoomMin = 0.05;
