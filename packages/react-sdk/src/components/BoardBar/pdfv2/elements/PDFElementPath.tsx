/*
 * Copyright 2024 Nordeck IT + Consulting GmbH
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

import { Polyline } from '@mui/icons-material';
import { Line } from '@react-pdf/renderer';
import { PathElement } from '../../../../state';
import { getRenderProperties as getRenderLineProperties } from '../../../elements/line/getRenderProperties';
import { getRenderProperties as getRenderPolyLineProperties } from '../../../elements/polyline/getRenderProperties';

export function PDFElementPath({ element }: { element: PathElement }) {
  switch (element.kind) {
    case 'line': {
      const {
        strokeColor,
        strokeWidth,
        points: { start, end },
      } = getRenderLineProperties(element);

      return (
        <Line
          x1={start.x}
          y1={start.y}
          x2={end.x}
          y2={end.y}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />
      );
    }
    case 'polyline': {
      const { strokeColor, strokeWidth, points } =
        getRenderPolyLineProperties(element);
      return (
        <Polyline
          points={`${points.map(({ x, y }) => `${x},${y}`).join(' ')}`}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />
      );
    }
    default:
      return null;
  }
}
