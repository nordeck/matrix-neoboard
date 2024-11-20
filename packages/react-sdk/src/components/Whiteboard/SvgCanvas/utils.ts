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

import { Point } from '../../../state';

export function calculateSvgCoords(position: Point, svg: SVGSVGElement) {
  const pt = svg.createSVGPoint();
  pt.x = position.x;
  pt.y = position.y;
  const floats = pt.matrixTransform(svg.getScreenCTM()!.inverse());
  return {
    x: floats.x,
    y: floats.y,
  };
}

export function calculateScale(
  width: number,
  height: number,
  viewportWidth: number,
  viewportHeight: number,
): number {
  const widthRatio = width / viewportWidth;
  const heightRatio = height / viewportHeight;
  return Math.max(widthRatio, heightRatio);
}

export async function svg2preview(html: HTMLElement): Promise<string> {
  const encoder = new TextEncoder();
  const uint8Array = encoder.encode(html.outerHTML);

  const compressedStream = new Response(
    new Blob([uint8Array]).stream().pipeThrough(new CompressionStream('gzip')),
  ).arrayBuffer();

  const compressedUint8Array = new Uint8Array(await compressedStream);
  const binaryString = String.fromCharCode(...compressedUint8Array);
  const base64String = btoa(binaryString);

  return base64String;
}
