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

import { Content } from 'pdfmake/interfaces';
import { PathElement } from '../../../state';
import { getRenderProperties as getRenderLineProperties } from '../../elements/line/getRenderProperties';
import { getRenderProperties as getRenderPolyLineProperties } from '../../elements/polyline/getRenderProperties';
import { canvas } from './utils';

export function createWhiteboardPdfElementPath(element: PathElement): Content {
  switch (element.kind) {
    case 'line':
      return createElementPathLine(element);

    case 'polyline':
      return createElementPathPolyLine(element);
  }
}

function createElementPathLine(element: PathElement): Content {
  const {
    strokeColor,
    strokeWidth,
    points: { start, end },
  } = getRenderLineProperties(element);

  return canvas({
    type: 'line',
    x1: start.x,
    y1: start.y,
    x2: end.x,
    y2: end.y,
    lineWidth: strokeWidth,
    lineColor: strokeColor,
  });
}

function createElementPathPolyLine(element: PathElement): Content {
  const { strokeColor, strokeWidth, points } =
    getRenderPolyLineProperties(element);

  return canvas({
    type: 'polyline',
    points,
    lineWidth: strokeWidth,
    lineColor: strokeColor,
  });
}
