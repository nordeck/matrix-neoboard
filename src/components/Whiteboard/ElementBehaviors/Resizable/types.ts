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

import { Elements } from '../../../../state/types';

export type LineElementHandlePositionName = 'start' | 'end';

export type LineElementHandlePosition = {
  name: LineElementHandlePositionName;
  x: number;
  y: number;
};

export type HandlePositionName =
  | 'top'
  | 'topRight'
  | 'right'
  | 'bottomRight'
  | 'bottom'
  | 'bottomLeft'
  | 'left'
  | 'topLeft';

export type HandlePosition =
  | {
      name: HandlePositionName;
      containerWidth: number;
      containerHeight: number;
    }
  | LineElementHandlePosition;

export type Dimensions = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ResizableProperties = Dimensions & {
  elements: Elements;
};
