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
import { ShapeElement } from '../../../state';
import { getRenderProperties as getRenderEllipseProperties } from '../../elements/ellipse/getRenderProperties';
import { getRenderProperties as getRenderRectangleProperties } from '../../elements/rectangle/getRenderProperties';
import { getRenderProperties as getRenderTriangleProperties } from '../../elements/triangle/getRenderProperties';
import { canvas, textContent } from './utils';

export function createWhiteboardPdfElementShape(
  element: ShapeElement,
): Content {
  switch (element.kind) {
    case 'rectangle':
      return createElementShapeRectangle(element);

    case 'circle':
    case 'ellipse':
      return createElementShapeEllipse(element);

    case 'triangle':
      return createElementShapeTriangle(element);
  }
}

function createElementShapeRectangle(element: ShapeElement): Content {
  const { strokeColor, strokeWidth, text, rx } =
    getRenderRectangleProperties(element);

  const { position, width, height } = element;

  return [
    canvas({
      type: 'rect',
      x: position.x,
      y: position.y,
      w: width,
      h: height,
      r: rx,
      color:
        element.fillColor !== 'transparent' ? element.fillColor : undefined,
      lineWidth: strokeWidth,
      lineColor: strokeColor !== 'transparent' ? strokeColor : undefined,
      strokeOpacity: strokeColor === 'transparent' ? 0 : 1,
    }),
    text ? textContent(element, text) : [],
  ];
}

function createElementShapeEllipse(element: ShapeElement): Content {
  const { strokeColor, strokeWidth, text } =
    getRenderEllipseProperties(element);

  const { position, width, height } = element;

  return [
    canvas({
      type: 'ellipse',
      x: position.x + width / 2,
      y: position.y + height / 2,
      r1: width / 2,
      r2: height / 2,
      color: element.fillColor,
      lineWidth: strokeWidth,
      lineColor: strokeColor,
    }),
    text ? textContent(element, text) : [],
  ];
}

function createElementShapeTriangle(element: ShapeElement): Content {
  const {
    strokeColor,
    strokeWidth,
    text,
    points: { p0X, p0Y, p1X, p1Y, p2X, p2Y },
  } = getRenderTriangleProperties(element);

  return [
    canvas({
      type: 'polyline',
      points: [
        { x: p0X, y: p0Y },
        { x: p1X, y: p1Y },
        { x: p2X, y: p2Y },
      ],
      color: element.fillColor,
      lineColor: strokeColor,
      lineWidth: strokeWidth,
      closePath: true,
    }),
    text ? textContent(element, text) : [],
  ];
}
