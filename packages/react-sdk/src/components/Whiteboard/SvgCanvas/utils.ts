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

import { Base64 } from 'js-base64';
import pako from 'pako';
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

export function svg2preview(html: HTMLElement): Promise<string> {
  return new Promise((resolve) => {
    // compress the SVG data
    const compressed = pako.gzip(html.outerHTML);
    // encode the compressed data as base64
    const result = Base64.fromUint8Array(compressed);
    resolve(result);
  });
}
