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

import { ImageMimeType } from './state';

// Convert a base64 string to a Uint8Array
//
// Note that due to charCodeAt the atob call is safe to use here
export function base64ToUint8Array(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}
// We use magic values just like libmagic does to detect the mimeType which pdfmake requires
export function base64ToMimeType(base64: string): ImageMimeType {
  const decoded = base64ToUint8Array(base64);
  return uint8ArrayToMimeType(decoded);
}

export function uint8ArrayToMimeType(uint8Array: Uint8Array): ImageMimeType {
  // Check if the file is an SVG
  try {
    getSVGUnsafe(new TextDecoder().decode(uint8Array));
    return 'image/svg+xml';
  } catch {
    // Not an SVG, continue with the other checks
  }

  const first_eight_bytes = uint8Array.subarray(0, 8);
  if (
    first_eight_bytes[0] === 0x89 &&
    first_eight_bytes[1] === 0x50 &&
    first_eight_bytes[2] === 0x4e &&
    first_eight_bytes[3] === 0x47 &&
    first_eight_bytes[4] === 0x0d &&
    first_eight_bytes[5] === 0x0a &&
    first_eight_bytes[6] === 0x1a &&
    first_eight_bytes[7] === 0x0a
  ) {
    return 'image/png';
  } else if (first_eight_bytes[0] === 0xff && first_eight_bytes[1] === 0xd8) {
    return 'image/jpeg';
  } else if (
    first_eight_bytes[0] === 0x47 &&
    first_eight_bytes[1] === 0x49 &&
    first_eight_bytes[2] === 0x46
  ) {
    return 'image/gif';
  }

  throw new Error('Unknown image type');
}

/**
 * Parses a given SVG string and returns it as a Document object.
 *
 * @param svg - The SVG string to be parsed.
 * @returns The parsed SVG as a Document object.
 * @throws Will throw an error if the provided string is not a valid SVG.
 */
export function getSVGUnsafe(svg: string): Document {
  const parser = new DOMParser();
  const svgDom = parser.parseFromString(svg, 'image/svg+xml');
  if (svgDom.documentElement.tagName === 'svg') {
    return svgDom;
  }
  throw new Error('Not an SVG');
}
