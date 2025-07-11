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

import React from 'react';
import { PathElement } from '../../../state';
import {
  ElementContextMenu,
  MoveableElement,
  SelectableElement,
  WithExtendedSelectionProps,
} from '../../Whiteboard';
import { useSvgScaleContext } from '../../Whiteboard/SvgScaleContext';
import { getRenderProperties } from './getRenderProperties';
import { useEndMarker } from './useEndMarker';
import { useStartMarker } from './useStartMarker';

export type LineElementProps = PathElement & WithExtendedSelectionProps;

const LineDisplay = ({
  readOnly,
  active,
  elementId,
  activeElementIds = [],
  overrides = {},
  ...element
}: LineElementProps) => {
  const {
    strokeColor,
    strokeWidth,
    points: { start, end },
  } = getRenderProperties(element);
  const { scale } = useSvgScaleContext();
  // Fallback to scale = 1 if scale is 0
  const adjustedScale = scale === 0 ? 1 : scale;
  const adjustedStrokeWidth = strokeWidth + 10 / adjustedScale;

  // Margin in pixels to offset the line endpoints so markers don't overlap the line
  const markerMargin = 3.5;

  // Calculate the direction vector and its length
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.sqrt(dx * dx + dy * dy) || 1;

  // Calculate normalized direction vector
  const nx = dx / length;
  const ny = dy / length;

  const { startMarkerId, startMarker } = useStartMarker(element);
  const { endMarkerId, endMarker } = useEndMarker(element);

  // Calculate margin offsets for start and end
  const startOffsetX = startMarkerId ? nx * markerMargin : 0;
  const startOffsetY = startMarkerId ? ny * markerMargin : 0;
  const endOffsetX = endMarkerId ? -nx * markerMargin : 0;
  const endOffsetY = endMarkerId ? -ny * markerMargin : 0;

  const renderedChild = (
    <g data-testid={`element-${elementId}`}>
      {startMarker}
      {endMarker}
      <line
        fill="none"
        stroke="transparent"
        strokeWidth={adjustedStrokeWidth}
        x1={start.x}
        x2={end.x}
        y1={start.y}
        y2={end.y}
      />
      <line
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        x1={start.x + startOffsetX}
        y1={start.y + startOffsetY}
        x2={end.x + endOffsetX}
        y2={end.y + endOffsetY}
        markerStart={startMarkerId ? `url(#${startMarkerId})` : undefined}
        markerEnd={endMarkerId ? `url(#${endMarkerId})` : undefined}
      />
    </g>
  );

  if (readOnly) {
    return renderedChild;
  }

  return (
    <SelectableElement
      active={active}
      readOnly={readOnly}
      elementId={elementId}
    >
      <MoveableElement elementId={elementId} overrides={overrides}>
        <ElementContextMenu activeElementIds={activeElementIds}>
          {renderedChild}
        </ElementContextMenu>
      </MoveableElement>
    </SelectableElement>
  );
};

export default React.memo(LineDisplay);
