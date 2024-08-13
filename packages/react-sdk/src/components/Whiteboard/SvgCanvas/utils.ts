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

// Alternative rendering of thumbnail preview
export function svg2jpeg(
  html: HTMLElement,
  width: number,
  height: number,
): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    [canvas.width, canvas.height] = [width, height];

    const ctx = canvas.getContext('2d') ?? new CanvasRenderingContext2D();
    const svgData = new XMLSerializer().serializeToString(html);

    const svgBlob = new Blob([svgData], {
      type: 'image/svg+xml;charset=utf-8',
    });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.src = url;

    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(img, 0, 0, width, height);
      const data = canvas.toDataURL('image/jpeg', 0.85);
      URL.revokeObjectURL(url);

      resolve(data);
    };
  });
}

export function svg2preview(html: HTMLElement): Promise<string> {
  return new Promise((resolve) => {
    // text input leaves behind lots of <br>, which SVG renderers don't not like
    const fixBreaks = html.outerHTML.replace(/<br>/g, '<br/>');
    const encodedSVG = encodeURIComponent(fixBreaks);
    /* ISSUES
     * - foreignObject (text) objects are not rendered
     * - images are not rendered (they need to be included as base64 images within the SVG content)
     * - SVG content should be compressed
     * - an thumbnail image would be a better, given it's contents would not increase beyond the state event size limit
     *   -> see above svg2jpeg function
     */
    const result = 'data:image/svg+xml,' + encodedSVG;
    resolve(result);
  });
}
