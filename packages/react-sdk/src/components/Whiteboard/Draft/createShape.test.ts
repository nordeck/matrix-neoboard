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

import { createShape, createShapeFromPoints } from './createShape';

describe('createShape', () => {
  it('should create basic shape', () => {
    const result = createShape({
      kind: 'rectangle',
      startCoords: { x: 10, y: 20 },
      endCoords: { x: 30, y: 40 },
      fillColor: '#ffffff',
      textColor: '#ff0000',
    });

    expect(result).toEqual({
      width: 20,
      height: 20,
      position: { x: 10, y: 20 },
      type: 'shape',
      kind: 'rectangle',
      text: '',
      fillColor: '#ffffff',
      textColor: '#ff0000',
    });
  });

  it('should create a rounded rectangle', () => {
    const result = createShape({
      kind: 'rectangle',
      startCoords: { x: 10, y: 20 },
      endCoords: { x: 30, y: 40 },
      fillColor: '#ffffff',
      rounded: true,
    });

    expect(result).toEqual({
      width: 20,
      height: 20,
      position: { x: 10, y: 20 },
      type: 'shape',
      kind: 'rectangle',
      text: '',
      fillColor: '#ffffff',
      borderRadius: 20,
    });
  });

  it('should choose the right shape if start and end position are inverted', () => {
    const result = createShape({
      kind: 'rectangle',
      startCoords: { x: 30, y: 40 },
      endCoords: { x: 10, y: 20 },
      fillColor: '#ffffff',
    });
    expect(result).toEqual({
      width: 20,
      height: 20,
      position: { x: 10, y: 20 },
      type: 'shape',
      kind: 'rectangle',
      text: '',
      fillColor: '#ffffff',
    });
  });

  it('should constrain dimensions to have same length', () => {
    const result = createShape({
      kind: 'circle',
      startCoords: { x: 10, y: 20 },
      endCoords: { x: 30, y: 60 },
      fillColor: '#ffffff',
      sameLength: true,
    });
    expect(result).toEqual({
      width: 40,
      height: 40,
      position: { x: 10, y: 20 },
      type: 'shape',
      kind: 'circle',
      text: '',
      fillColor: '#ffffff',
    });
  });

  it('should constrain dimensions to have same length, if start and end position are inverted', () => {
    const result = createShape({
      kind: 'circle',
      startCoords: { x: 30, y: 60 },
      endCoords: { x: 10, y: 20 },
      fillColor: '#ffffff',
      sameLength: true,
    });
    expect(result).toEqual({
      width: 30,
      height: 30,
      position: { x: 0, y: 30 },
      type: 'shape',
      kind: 'circle',
      text: '',
      fillColor: '#ffffff',
    });
  });

  it('should constrain dimensions to have same length, but should not leave the bounds of the whiteboard', () => {
    const result = createShape({
      kind: 'circle',
      startCoords: { x: 60, y: 20 },
      endCoords: { x: 10, y: 10 },
      fillColor: '#ffffff',
      sameLength: true,
    });
    expect(result).toEqual({
      width: 20,
      height: 20,
      position: { x: 40, y: 0 },
      type: 'shape',
      kind: 'circle',
      text: '',
      fillColor: '#ffffff',
    });
  });

  it('should constrain to the grid', () => {
    const result = createShape({
      kind: 'circle',
      startCoords: { x: 10, y: 20 },
      endCoords: { x: 30, y: 60 },
      fillColor: '#ffffff',
      gridCellSize: 40,
    });
    expect(result).toEqual({
      width: 40,
      height: 40,
      position: { x: 0, y: 40 },
      type: 'shape',
      kind: 'circle',
      text: '',
      fillColor: '#ffffff',
    });
  });

  it('should constrain to the grid if start and end position are inverted', () => {
    const result = createShape({
      kind: 'circle',
      startCoords: { x: 30, y: 60 },
      endCoords: { x: 10, y: 20 },
      fillColor: '#ffffff',
      gridCellSize: 40,
    });
    expect(result).toEqual({
      width: 40,
      height: 40,
      position: { x: 0, y: 40 },
      type: 'shape',
      kind: 'circle',
      text: '',
      fillColor: '#ffffff',
    });
  });
});

describe('createShapeFromPoints', () => {
  it('should create basic line', () => {
    const cursorPoints = [
      { x: 10, y: 20 },
      { x: 30, y: 40 },
      { x: 50, y: 60 },
    ];
    const result = createShapeFromPoints({
      kind: 'polyline',
      cursorPoints,
      strokeColor: '#000000',
    });
    expect(result).toEqual({
      points: [
        { x: 0, y: 0 },
        { x: 20, y: 20 },
        { x: 40, y: 40 },
      ],
      position: { x: 10, y: 20 },
      strokeColor: '#000000',
      type: 'path',
      kind: 'polyline',
    });
  });

  it('should create basic line with an end marker', () => {
    const cursorPoints = [
      { x: 10, y: 20 },
      { x: 30, y: 40 },
      { x: 50, y: 60 },
    ];
    const result = createShapeFromPoints({
      kind: 'polyline',
      cursorPoints,
      strokeColor: '#000000',
      endMarker: 'arrow-head-line',
    });
    expect(result).toEqual({
      points: [
        { x: 0, y: 0 },
        { x: 20, y: 20 },
        { x: 40, y: 40 },
      ],
      position: { x: 10, y: 20 },
      strokeColor: '#000000',
      type: 'path',
      kind: 'polyline',
      endMarker: 'arrow-head-line',
    });
  });

  it('should only use the first and last point to define a simple line', () => {
    const cursorPoints = [
      { x: 10, y: 20 },
      { x: 100, y: 40 },
      { x: 50, y: 60 },
    ];
    const result = createShapeFromPoints({
      kind: 'line',
      cursorPoints,
      strokeColor: '#000000',
      onlyStartAndEndPoints: true,
    });
    expect(result).toEqual({
      points: [
        { x: 0, y: 0 },
        { x: 40, y: 40 },
      ],
      position: { x: 10, y: 20 },
      strokeColor: '#000000',
      type: 'path',
      kind: 'line',
    });
  });

  it('should constrain to the grid', () => {
    const cursorPoints = [
      { x: 10, y: 20 },
      { x: 50, y: 60 },
    ];
    const result = createShapeFromPoints({
      kind: 'line',
      cursorPoints,
      strokeColor: '#000000',
      onlyStartAndEndPoints: true,
      gridCellSize: 40,
    });
    expect(result).toEqual({
      points: [
        { x: 0, y: 0 },
        { x: 40, y: 40 },
      ],
      position: { x: 0, y: 40 },
      strokeColor: '#000000',
      type: 'path',
      kind: 'line',
    });
  });
});
