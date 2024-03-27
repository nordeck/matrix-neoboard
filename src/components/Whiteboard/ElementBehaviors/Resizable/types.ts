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

export type LineElementHandlePosition = 'start' | 'end';

export type LineElementHandleProperties = {
  handlePosition: LineElementHandlePosition;
  handlePositionX: number;
  handlePositionY: number;
};

export type HandlePosition =
  | 'top'
  | 'topRight'
  | 'right'
  | 'bottomRight'
  | 'bottom'
  | 'bottomLeft'
  | 'left'
  | 'topLeft';

export type HandleProperties =
  | {
      handlePosition: HandlePosition;
      containerWidth: number;
      containerHeight: number;
    }
  | LineElementHandleProperties;

export type Dimensions = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ResizableProperties = Dimensions & {
  elements: Elements;
};
