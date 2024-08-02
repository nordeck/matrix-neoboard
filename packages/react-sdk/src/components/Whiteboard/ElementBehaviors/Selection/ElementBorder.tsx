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

import { useTheme } from '@mui/material';
import { calculateBoundingRectForElements } from '../../../../state';
import { useElementOverrides } from '../../../ElementOverridesProvider';
import { useLayoutState } from '../../../Layout';
import { getRenderProperties } from '../../../elements/line/getRenderProperties';
import { useSvgCanvasContext } from '../../SvgCanvas';

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
  elementIds: string[];
  padding?: number;
};

export function ElementBorder({ elementIds, padding = 1 }: ElementBorderProps) {
  const theme = useTheme();
  const { activeTool } = useLayoutState();
  const isInSelectionMode = activeTool === 'select';
  const { scale } = useSvgCanvasContext();

  const elements = Object.values(useElementOverrides(elementIds));
  const {
    offsetX: x,
    offsetY: y,
    width,
    height,
  } = calculateBoundingRectForElements(elements);

  const scaledPadding = padding / scale;
  const selectionBorderWidth = 2 / scale;
  const selectionX = x - (selectionBorderWidth / 2 + scaledPadding);
  const selectionY = y - (selectionBorderWidth / 2 + scaledPadding);
  const selectionWidth = width + 2 * (selectionBorderWidth / 2 + scaledPadding);
  const selectionHeight =
    height + 2 * (selectionBorderWidth / 2 + scaledPadding);
  const lineRenderProperties =
    elements.length === 1 &&
    elements[0] !== undefined &&
    'kind' in elements[0] &&
    elements[0].kind === 'line' &&
    getRenderProperties(elements[0]);

  return (
    <>
      {isInSelectionMode && (
        <g>
          {!lineRenderProperties && (
            <>
              <line
                key={`element-${elementIds[0]}-border-south`}
                fill="none"
                stroke={theme.palette.primary.main}
                strokeWidth={selectionBorderWidth}
                x1={selectionX}
                x2={selectionX + selectionWidth}
                y1={selectionY}
                y2={selectionY}
              />
              <line
                key={`element-${elementIds[0]}-border-east`}
                fill="none"
                stroke={theme.palette.primary.main}
                strokeWidth={selectionBorderWidth}
                x1={selectionX + selectionWidth}
                x2={selectionX + selectionWidth}
                y1={selectionY}
                y2={selectionY + selectionHeight}
              />
              <line
                key={`element-${elementIds[0]}-border-north`}
                fill="none"
                stroke={theme.palette.primary.main}
                strokeWidth={selectionBorderWidth}
                x1={selectionX + selectionWidth}
                x2={selectionX}
                y1={selectionY + selectionHeight}
                y2={selectionY + selectionHeight}
              />
              <line
                key={`element-${elementIds[0]}-border-west`}
                fill="none"
                stroke={theme.palette.primary.main}
                strokeWidth={selectionBorderWidth}
                x1={selectionX}
                x2={selectionX}
                y1={selectionY + selectionHeight}
                y2={selectionY}
              />
            </>
          )}
          {lineRenderProperties ? (
            <>
              <SelectionAnchor
                x={lineRenderProperties.points.start.x}
                y={lineRenderProperties.points.start.y}
                borderWidth={selectionBorderWidth}
              />
              <SelectionAnchor
                x={lineRenderProperties.points.end.x}
                y={lineRenderProperties.points.end.y}
                borderWidth={selectionBorderWidth}
              />
            </>
          ) : (
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
        </g>
      )}
    </>
  );
}
