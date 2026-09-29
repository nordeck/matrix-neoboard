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
