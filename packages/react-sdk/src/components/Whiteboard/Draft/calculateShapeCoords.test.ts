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

import { Point, ShapeKind } from '../../../state';
import { ShapeSizesState } from '../../../store/shapeSizesSlide';
import { calculateShapeCoords } from './calculateShapeCoords';

const shapeSizes: ShapeSizesState = {
  rectangle: { width: 300, height: 200 },
  triangle: { width: 100, height: 500 },
  ellipse: { width: 500, height: 250 },
  circle: { width: 400, height: 100 },
};

describe('calculateShapeCoords', () => {
  it.each([
    [
      'rectangle',
      { x: 500, y: 600 },
      {
        startCoords: {
          x: 350,
          y: 500,
        },
        endCoords: { x: 650, y: 700 },
      },
    ],
    [
      'triangle',
      { x: 500, y: 600 },
      {
        startCoords: {
          x: 450,
          y: 350,
        },
        endCoords: { x: 550, y: 850 },
      },
    ],
    [
      'circle',
      { x: 500, y: 600 },
      {
        startCoords: {
          x: 300,
          y: 550,
        },
        endCoords: { x: 700, y: 650 },
      },
    ],
    [
      'ellipse',
      { x: 500, y: 600 },
      {
        startCoords: {
          x: 250,
          y: 475,
        },
        endCoords: { x: 750, y: 725 },
      },
    ],
  ] as [ShapeKind, Point, ReturnType<typeof calculateShapeCoords>][])(
    'should calculate the correct coordinates for a %s somewhere on the board',
    (kind, coordinates, expected) => {
      expect(calculateShapeCoords(kind, coordinates, shapeSizes)).toEqual(
        expected,
      );
    },
  );

  it.each([
    [
      { x: 50, y: 50 },
      {
        startCoords: {
          x: 0,
          y: 0,
        },
        endCoords: { x: 300, y: 200 },
      },
    ],
    [
      { x: 50, y: 1030 },
      {
        startCoords: {
          x: 0,
          y: 880,
        },
        endCoords: { x: 300, y: 1080 },
      },
    ],
    [
      { x: 1890, y: 50 },
      {
        startCoords: {
          x: 1620,
          y: 0,
        },
        endCoords: { x: 1920, y: 200 },
      },
    ],
    [
      { x: 1890, y: 1030 },
      {
        startCoords: {
          x: 1620,
          y: 880,
        },
        endCoords: { x: 1920, y: 1080 },
      },
    ],
  ] as [Point, ReturnType<typeof calculateShapeCoords>][])(
    'should calculate shifted coordinates on the edges',
    (coordinates, expected) => {
      expect(
        calculateShapeCoords('rectangle', coordinates, shapeSizes),
      ).toEqual(expected);
    },
  );
});
