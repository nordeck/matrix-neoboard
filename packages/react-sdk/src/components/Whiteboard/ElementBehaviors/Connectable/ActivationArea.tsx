/*
 * Copyright 2025 Nordeck IT + Consulting GmbH
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

import { ShapeKind } from '../../../../state';

export function ActivationArea({
  elementId,
  kind,
  x,
  y,
  width,
  height,
}: {
  elementId: string;
  kind: ShapeKind;
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  const shapeMargin = 40;

  if (kind === 'circle' || kind === 'ellipse') {
    return (
      <ellipse
        data-connect-type={`activation-area`}
        data-connect-element-id={elementId}
        cx={x + width / 2}
        cy={y + height / 2}
        fill="transparent"
        rx={width / 2 + shapeMargin}
        ry={height / 2 + shapeMargin}
      />
    );
  } else if (kind === 'rectangle') {
    return (
      <rect
        data-connect-type={`activation-area`}
        data-connect-element-id={elementId}
        x={x - shapeMargin}
        y={y - shapeMargin}
        width={width + 2 * shapeMargin}
        height={height + 2 * shapeMargin}
        fill="transparent"
      />
    );
  } else if (kind === 'triangle') {
    const { dx, dy } = scaleTriangle(width / 2, height, shapeMargin);

    const p0X = x - dx;
    const p0Y = y + height + shapeMargin;
    const p1X = x + width / 2;
    const p1Y = y - dy;
    const p2X = x + width + dx;
    const p2Y = y + height + shapeMargin;

    return (
      <polygon
        data-connect-type={`activation-area`}
        data-connect-element-id={elementId}
        fill="transparent"
        points={`${p0X},${p0Y} ${p1X},${p1Y} ${p2X},${p2Y}`}
      />
    );
  } else {
    return null;
  }
}

function scaleTriangle(
  w: number,
  h: number,
  margin: number,
): { dx: number; dy: number } {
  const w1 = (w * (h + margin)) / h;
  const sin =
    (h + margin) / Math.pow((h + margin) * (h + margin) + w1 * w1, 0.5);
  const h1 = w1 * sin;
  const dy = (margin * (h + margin)) / h1;
  const h2 = (w1 - w) * sin;
  const dx = ((w1 - w) * (h2 + margin)) / h2;
  return { dx, dy };
}
