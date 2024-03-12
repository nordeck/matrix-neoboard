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

import { ElementKind, PathKind, Point, ShapeKind } from '../../../../state';

export type LineElementResizeHandlePosition = 'start' | 'end';

export type PolylineAndShapeElementsResizeHandlePosition =
  | 'top'
  | 'topRight'
  | 'right'
  | 'bottomRight'
  | 'bottom'
  | 'bottomLeft'
  | 'left'
  | 'topLeft';

export type ResizeHandlePosition =
  | LineElementResizeHandlePosition
  | PolylineAndShapeElementsResizeHandlePosition;

export type LineElementProps = {
  elementKind: 'line';
  handlePosition: LineElementResizeHandlePosition;
  handlePositionX: number;
  handlePositionY: number;
};

export type PolylineAndShapeElementsProps = {
  elementKind: Exclude<ElementKind, 'line'>;
  handlePosition: PolylineAndShapeElementsResizeHandlePosition;
  containerWidth: number;
  containerHeight: number;
};

export type DimensionsVertical = {
  y: number;
  height: number;
};

export type DimensionsHorizontal = {
  x: number;
  width: number;
};

export type DimensionsBase = DimensionsVertical & DimensionsHorizontal;

export type PathElementDimensions = DimensionsBase & {
  elementKind: PathKind;
  points: Point[];
};

export type ShapeElementDimensions = DimensionsBase & {
  elementKind: ShapeKind;
};

export type Dimensions = PathElementDimensions | ShapeElementDimensions;
