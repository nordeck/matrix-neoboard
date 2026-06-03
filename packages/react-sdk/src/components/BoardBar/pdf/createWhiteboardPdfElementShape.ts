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
import { Point, ShapeElement } from '../../../state';
import { getRenderProperties as getRenderBlockArrowProperties } from '../../elements/block-arrow/getRenderProperties';
import { getRenderProperties as getRenderEllipseProperties } from '../../elements/ellipse/getRenderProperties';
import { getRenderProperties as getRenderRectangleProperties } from '../../elements/rectangle/getRenderProperties';
import { getRenderProperties as getRenderTriangleProperties } from '../../elements/triangle/getRenderProperties';
import { canvas, textContent } from './utils';

export function createWhiteboardPdfElementShape(
  element: ShapeElement,
  offset: Point = { x: 0, y: 0 },
): Content {
  switch (element.kind) {
    case 'rectangle':
      return createElementShapeRectangle(element, offset);

    case 'circle':
    case 'ellipse':
      return createElementShapeEllipse(element, offset);

    case 'triangle':
      return createElementShapeTriangle(element, offset);

    case 'block-arrow':
      return createElementShapeBlockArrow(element, offset);
  }
}

function createElementShapeRectangle(
  element: ShapeElement,
  offset: Point = { x: 0, y: 0 },
): Content {
  const { strokeColor, strokeWidth, text, rx } =
    getRenderRectangleProperties(element);

  const { position, width, height } = element;

  return [
    canvas({
      type: 'rect',
      x: position.x + offset.x,
      y: position.y + offset.y,
      w: width,
      h: height,
      r: rx,
      color:
        element.fillColor !== 'transparent' ? element.fillColor : undefined,
      lineWidth: strokeWidth,
      lineColor: strokeColor !== 'transparent' ? strokeColor : undefined,
      strokeOpacity: strokeColor === 'transparent' ? 0 : 1,
    }),
    text ? textContent(element, text, offset) : [],
  ];
}

function createElementShapeEllipse(
  element: ShapeElement,
  offset: Point = { x: 0, y: 0 },
): Content {
  const { strokeColor, strokeWidth, text } =
    getRenderEllipseProperties(element);

  const { position, width, height } = element;

  return [
    canvas({
      type: 'ellipse',
      x: position.x + width / 2 + offset.x,
      y: position.y + height / 2 + offset.y,
      r1: width / 2,
      r2: height / 2,
      color: element.fillColor,
      lineWidth: strokeWidth,
      lineColor: strokeColor,
    }),
    text ? textContent(element, text, offset) : [],
  ];
}

function createElementShapeTriangle(
  element: ShapeElement,
  offset: Point = { x: 0, y: 0 },
): Content {
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
      ].map((p) => ({ x: p.x + offset.x, y: p.y + offset.y })),
      color: element.fillColor,
      lineColor: strokeColor,
      lineWidth: strokeWidth,
      closePath: true,
    }),
    text ? textContent(element, text, offset) : [],
  ];
}

function createElementShapeBlockArrow(
  element: ShapeElement,
  offset: Point = { x: 0, y: 0 },
): Content {
  const { strokeColor, strokeWidth, text, points } =
    getRenderBlockArrowProperties(element);

  return [
    canvas({
      type: 'polyline',
      points: points.map((p) => ({ x: p.x + offset.x, y: p.y + offset.y })),
      closePath: true,
      color:
        element.fillColor !== 'transparent' ? element.fillColor : undefined,
      lineWidth: strokeWidth,
      lineColor: strokeColor !== 'transparent' ? strokeColor : undefined,
      strokeOpacity: strokeColor === 'transparent' ? 0 : 1,
    }),
    text ? textContent(element, text, offset) : [],
  ];
}
