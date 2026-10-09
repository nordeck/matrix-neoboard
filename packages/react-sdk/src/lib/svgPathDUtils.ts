/*
 * Copyright 2026 Nordeck IT + Consulting GmbH
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

import { Point } from '../state';

type PathCommand = {
  code: string;
  args: number[];
};

const ARG_COUNTS: Record<string, number> = {
  m: 2,
  l: 2,
  t: 2,
  h: 1,
  v: 1,
  c: 6,
  s: 4,
  q: 4,
  a: 7,
  z: 0,
};

const COMMAND_PATTERN = /^[MmLlHhVvCcSsQqTtAaZz]$/;
const LETTER_PATTERN = /^[A-Za-z]$/;
const TOKEN_PATTERN = /[A-Za-z]|[-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?/g;

function argCountFor(code: string): number {
  const count = ARG_COUNTS[code.toLowerCase()];
  if (count === undefined) {
    throw new Error(`Unsupported SVG path command "${code}"`);
  }
  return count;
}

function parsePathD(d: string): PathCommand[] {
  const tokens = d.match(TOKEN_PATTERN) ?? [];
  const commands: PathCommand[] = [];

  let index = 0;
  let code: string | undefined;

  while (index < tokens.length) {
    if (LETTER_PATTERN.test(tokens[index])) {
      if (!COMMAND_PATTERN.test(tokens[index])) {
        throw new Error(`Unsupported SVG path command "${tokens[index]}"`);
      }
      code = tokens[index];
      index++;
    }
    if (!code) {
      throw new Error(
        `Invalid path data: expected a command before "${tokens[index]}"`,
      );
    }

    const argCount = argCountFor(code);
    const args = tokens.slice(index, index + argCount).map(Number);
    if (args.length < argCount) {
      throw new Error(
        `Invalid path data: not enough arguments for command "${code}"`,
      );
    }

    commands.push({ code, args });
    index += argCount;

    // Repeated coordinate pairs after "M"/"m" are implicit "L"/"l" commands.
    if (code === 'M') code = 'L';
    else if (code === 'm') code = 'l';
  }

  return commands;
}

function scaleArcArgs(
  args: number[],
  scaleX: number,
  scaleY: number,
): number[] {
  const [rx, ry, xAxisRotation, largeArcFlag, sweepFlag, x, y] = args;
  // Mirroring on exactly one axis reverses the arc's sweep direction.
  const flipSweep = scaleX < 0 !== scaleY < 0;

  return [
    Math.abs(rx * scaleX),
    Math.abs(ry * scaleY),
    xAxisRotation,
    largeArcFlag,
    flipSweep ? (sweepFlag ? 0 : 1) : sweepFlag,
    x * scaleX,
    y * scaleY,
  ];
}

function scaleArgs(
  code: string,
  args: number[],
  scaleX: number,
  scaleY: number,
): number[] {
  switch (code.toLowerCase()) {
    case 'h':
      return args.map((x) => x * scaleX);
    case 'v':
      return args.map((y) => y * scaleY);
    case 'z':
      return [];
    case 'a':
      return scaleArcArgs(args, scaleX, scaleY);
    default:
      // m, l, t, c, s, q: alternating (x, y) coordinates.
      return args.map((value, i) =>
        i % 2 === 0 ? value * scaleX : value * scaleY,
      );
  }
}

function formatNumber(value: number, precision: number = 5): string {
  return String(Number(value.toFixed(precision)));
}

/**
 * Parses an SVG `<path d="...">` string and returns a new `d` string with
 * every coordinate scaled by the given factors around the origin (0,0).
 */
export function scalePathD(d: string, scaleX: number, scaleY: number): string {
  return parsePathD(d)
    .map(({ code, args }) => {
      const scaledArgs = scaleArgs(code, args, scaleX, scaleY);
      return code + scaledArgs.map((value) => formatNumber(value)).join(',');
    })
    .join(' ');
}

/** Evaluates a cubic bezier curve at parameter `t` (0 = start, 1 = end). */
function cubicAt(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const mt = 1 - t;
  const w0 = mt * mt * mt;
  const w1 = 3 * mt * mt * t;
  const w2 = 3 * mt * t * t;
  const w3 = t * t * t;

  return {
    x: w0 * p0.x + w1 * p1.x + w2 * p2.x + w3 * p3.x,
    y: w0 * p0.y + w1 * p1.y + w2 * p2.y + w3 * p3.y,
  };
}

// Roots of the derivative of a cubic bezier (a quadratic) within (0, 1),
// evaluated along a single axis. Returns parameter `t` array.
function cubicExtremaParams(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  axis: keyof Point,
): number[] {
  const a = -p0[axis] + 3 * p1[axis] - 3 * p2[axis] + p3[axis];
  const b = 2 * (p0[axis] - 2 * p1[axis] + p2[axis]);
  const c = p1[axis] - p0[axis];
  const roots: number[] = [];

  if (Math.abs(a) < 1e-12) {
    if (Math.abs(b) > 1e-12) roots.push(-c / b);
  } else {
    const disc = b * b - 4 * a * c;
    if (disc >= 0) {
      const sqrt = Math.sqrt(disc);
      roots.push((-b + sqrt) / (2 * a), (-b - sqrt) / (2 * a));
    }
  }

  return roots.filter((t) => t > 0 && t < 1);
}

/**
 * Finds the points where a cubic bezier curve has a local extremum on the
 * x or y axis.
 *
 * @param p0 - start point
 * @param p1 - first control point
 * @param p2 - second control point
 * @param p3 - end point
 * @returns the points on the curve at its turning points strictly between
 *   start and end (empty if the curve is monotone on both axes)
 */
export function cubicExtrema(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
): Point[] {
  const ts = [
    ...cubicExtremaParams(p0, p1, p2, p3, 'x'),
    ...cubicExtremaParams(p0, p1, p2, p3, 'y'),
  ];

  return ts.map((t) => cubicAt(p0, p1, p2, p3, t));
}

/**
 * Calculates the exact bounding box of an SVG path `d` string
 */
export function calculateBoundsForPathD(d: string): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  const xs: number[] = [];
  const ys: number[] = [];
  let cx = 0;
  let cy = 0;
  let startX = 0;
  let startY = 0;

  const add = (x: number, y: number) => {
    xs.push(x);
    ys.push(y);
  };

  for (const { code, args } of parsePathD(d)) {
    const rel = code === code.toLowerCase();
    const ox = rel ? cx : 0;
    const oy = rel ? cy : 0;

    switch (code.toLowerCase()) {
      case 'm':
      case 'l':
        cx = ox + args[0];
        cy = oy + args[1];
        if (code.toLowerCase() === 'm') {
          startX = cx;
          startY = cy;
        }
        add(cx, cy);
        break;
      case 'h':
        cx = ox + args[0];
        add(cx, cy);
        break;
      case 'v':
        cy = oy + args[0];
        add(cx, cy);
        break;
      case 'c': {
        const x1 = ox + args[0];
        const y1 = oy + args[1];
        const x2 = ox + args[2];
        const y2 = oy + args[3];
        const x3 = ox + args[4];
        const y3 = oy + args[5];
        for (const p of cubicExtrema(
          { x: cx, y: cy },
          { x: x1, y: y1 },
          { x: x2, y: y2 },
          { x: x3, y: y3 },
        )) {
          add(p.x, p.y);
        }
        add(x3, y3);
        cx = x3;
        cy = y3;
        break;
      }
      case 'z':
        cx = startX;
        cy = startY;
        break;
      default:
        throw new Error(`Unsupported SVG path command "${code}"`);
    }
  }

  if (xs.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}
