/*
 * Copyright 2023 Nordeck IT + Consulting GmbH
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

import { styled, useTheme } from '@mui/material';
import { calculateBoundingRectForPoints } from '../../../../state';
import { useElementOverride } from '../../../ElementOverridesProvider';
import { useLayoutState } from '../../../Layout';
import { useSvgCanvasContext } from '../../SvgCanvas';

const NoInteraction = styled('g')({
  pointerEvents: 'none',
});

function SelectionAnchor({
  x,
  y,
  borderWidth,
}: {
  x: number;
  y: number;
  borderWidth: number;
}) {
  const theme = useTheme();
  const { scale } = useSvgCanvasContext();
  const selectionAnchorFill = 'white';
  const selectionAnchorCornerRadius = 3 / scale;
  const selectionAnchorSize = 10 / scale;

  return (
    <rect
      x={x - selectionAnchorSize / 2}
      y={y - selectionAnchorSize / 2}
      fill={selectionAnchorFill}
      width={selectionAnchorSize}
      height={selectionAnchorSize}
      stroke={theme.palette.primary.main}
      strokeWidth={borderWidth}
      rx={selectionAnchorCornerRadius}
      ry={selectionAnchorCornerRadius}
    />
  );
}

export type ElementBorderProps = {
  elementId: string;
  padding?: number;
};

export function ElementBorder({ elementId, padding = 1 }: ElementBorderProps) {
  const theme = useTheme();
  const { activeTool } = useLayoutState();
  const isInSelectionMode = activeTool === 'select';
  const { scale } = useSvgCanvasContext();
  const element = useElementOverride(elementId);
  const x = element?.position.x ?? 0;
  const y = element?.position.y ?? 0;
  const height =
    element?.type === 'path'
      ? calculateBoundingRectForPoints(element.points).height
      : element?.height ?? 0;
  const width =
    element?.type === 'path'
      ? calculateBoundingRectForPoints(element.points).width
      : element?.width ?? 0;
  const scaledPadding = padding / scale;
  const selectionBorderWidth = 2 / scale;
  const selectionX = x - (selectionBorderWidth / 2 + scaledPadding);
  const selectionY = y - (selectionBorderWidth / 2 + scaledPadding);
  const selectionWidth = width + 2 * (selectionBorderWidth / 2 + scaledPadding);
  const selectionHeight =
    height + 2 * (selectionBorderWidth / 2 + scaledPadding);
  const resizable = element?.type === 'shape';

  return (
    <>
      {isInSelectionMode && (
        <NoInteraction>
          <rect
            fill="transparent"
            height={selectionHeight}
            stroke={theme.palette.primary.main}
            strokeWidth={selectionBorderWidth}
            width={selectionWidth}
            x={selectionX}
            y={selectionY}
          />
          {resizable && (
            <>
              <SelectionAnchor
                x={selectionX}
                y={selectionY}
                borderWidth={selectionBorderWidth}
              />
              <SelectionAnchor
                x={selectionX + selectionWidth}
                y={selectionY}
                borderWidth={selectionBorderWidth}
              />
              <SelectionAnchor
                x={selectionX + selectionWidth}
                y={selectionY + selectionHeight}
                borderWidth={selectionBorderWidth}
              />
              <SelectionAnchor
                x={selectionX}
                y={selectionY + selectionHeight}
                borderWidth={selectionBorderWidth}
              />
            </>
          )}
        </NoInteraction>
      )}
    </>
  );
}
