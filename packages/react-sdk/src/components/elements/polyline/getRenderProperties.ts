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

import { PathElement, Point } from '../../../state';
import { ElementRenderProperties } from '../../Whiteboard';

type PolylineRenderProperties = {
  points: Point[];
};

export function getRenderProperties(
  element: PathElement,
): ElementRenderProperties & PolylineRenderProperties {
  return {
    strokeColor: element.strokeColor,
    strokeWidth: 4,

    points: element.points.map(({ x, y }) => ({
      x: element.position.x + x,
      y: element.position.y + y,
    })),
  };
}
