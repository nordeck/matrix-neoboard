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
  points: { start: Point; end: Point };
};

export function getRenderProperties(
  element: PathElement,
): ElementRenderProperties & PolylineRenderProperties {
  const start = element.points[0];
  const end = element.points[element.points.length - 1];

  return {
    strokeColor: element.strokeColor,
    strokeWidth: 4,

    points: {
      start: {
        x: element.position.x + start.x,
        y: element.position.y + start.y,
      },
      end: {
        x: element.position.x + end.x,
        y: element.position.y + end.y,
      },
    },
  };
}
