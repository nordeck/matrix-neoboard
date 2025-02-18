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

import { useTheme } from '@mui/material';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { isDefined } from '../../../../lib';
import { ShapeElement } from '../../../../state';
import { useConnectionPoint } from '../../../ConnectionPointProvider';
import { useSvgCanvasContext } from '../../SvgCanvas';
import { ActivationArea } from './ActivationArea';

type ConnectableElementProps = {
  elementId: string;
  element: ShapeElement;
};

export function ConnectableElement({
  elementId,
  element: {
    kind,
    position: { x, y },
    width,
    height,
  },
}: ConnectableElementProps) {
  const theme = useTheme();
  const { scale } = useSvgCanvasContext();

  const [showConnectionAnchors, setShowConnectionAnchors] =
    useState<boolean>(false);

  const connectionPointAreaSize = 20 / scale;

  const connectionAnchorBorderWidth = 2 / scale;
  const connectionAnchorSize = 5 / scale;
  const connectionAnchorCornerRadius = 3 / 2 / scale;

  const { connectElementId } = useConnectionPoint();

  useEffect(() => {
    setShowConnectionAnchors(elementId === connectElementId);
  }, [connectElementId, elementId]);

  const points = useMemo(
    () =>
      [
        kind === 'rectangle' ? [x, y] : undefined,
        [x + width / 2, y],
        kind === 'rectangle' ? [x + width, y] : undefined,
        kind !== 'triangle' ? [x, y + height / 2] : undefined,
        kind !== 'triangle' ? [x + width, y + height / 2] : undefined,
        kind === 'triangle' ? [x + width / 4, y + height / 2] : undefined,
        kind === 'triangle' ? [x + (width * 3) / 4, y + height / 2] : undefined,
        kind === 'rectangle' || kind === 'triangle'
          ? [x, y + height]
          : undefined,
        [x + width / 2, y + height],
        kind === 'rectangle' || kind === 'triangle'
          ? [x + width, y + height]
          : undefined,
      ].filter(isDefined),
    [x, y, height, width, kind],
  );

  return (
    <>
      <ActivationArea
        elementId={elementId}
        kind={kind}
        x={x}
        y={y}
        width={width}
        height={height}
      />

      {points.map(([pointX, pointY], idx) => (
        <Fragment key={idx}>
          <rect
            data-connect-type="connection-point-area"
            data-connect-element-id={elementId}
            x={pointX - connectionPointAreaSize / 2}
            y={pointY - connectionPointAreaSize / 2}
            width={connectionPointAreaSize}
            height={connectionPointAreaSize}
            fill="transparent"
          />

          {showConnectionAnchors && (
            <rect
              data-connect-type="connection-point"
              data-connect-element-id={elementId}
              x={pointX - connectionAnchorSize / 2}
              y={pointY - connectionAnchorSize / 2}
              width={connectionAnchorSize}
              height={connectionAnchorSize}
              fill="white"
              stroke={theme.palette.primary.main}
              strokeWidth={connectionAnchorBorderWidth}
              rx={connectionAnchorCornerRadius}
              ry={connectionAnchorCornerRadius}
            />
          )}
        </Fragment>
      ))}
    </>
  );
}
