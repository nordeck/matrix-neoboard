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

import React, { useEffect } from 'react';
import { simplifyPointsToD } from '../../../lib/pathSmoothing';
import {
  calculateBoundingRectForPoints,
  PathElement,
  useWhiteboardSlideInstance,
} from '../../../state';
import {
  ElementContextMenu,
  MoveableElement,
  SelectableElement,
  WithExtendedSelectionProps,
} from '../../Whiteboard';
import { ElementFrameOverlay } from '../ElementFrameOverlay';
import { getRenderProperties } from './getRenderProperties';

export type PolylineElementProps = PathElement & WithExtendedSelectionProps;

const PolylineDisplay = ({
  readOnly,
  active,
  elementId,
  activeElementIds = [],
  elements = {},
  elementMovedHasFrame,
  ...element
}: PolylineElementProps) => {
  const { strokeColor, strokeWidth, points } = getRenderProperties(element);
  const boundingRect = calculateBoundingRectForPoints(element.points);
  const slideInstance = useWhiteboardSlideInstance();

  const { svgPathD } = element;

  useEffect(() => {
    if (elementId === 'draft') return;

    // don't overwrite existing curve
    if (svgPathD) return;

    // Timeout should make the UI more responsive if many paths are being siplified at the same time (initial load for example).
    const timer = setTimeout(() => {
      const d = simplifyPointsToD(element.points);
      slideInstance.updateElement(elementId, { svgPathD: d });
    }, 0);

    return () => clearTimeout(timer);
  }, [svgPathD, elementId, slideInstance, element.points]);

  const renderedChild = (
    <g data-testid={`element-${elementId}`}>
      {svgPathD ? (
        <path
          transform={`translate(${element.position.x}, ${element.position.y})`}
          d={svgPathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        ></path>
      ) : (
        <polyline
          fill="none"
          points={points.map(({ x, y }) => `${x},${y}`).join(' ')}
          stroke={strokeColor}
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
        />
      )}
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
      <MoveableElement elementId={elementId} elements={elements}>
        <ElementContextMenu
          elementId={elementId}
          activeElementIds={activeElementIds}
        >
          {renderedChild}
          {elementMovedHasFrame && (
            <ElementFrameOverlay
              offsetX={element.position.x}
              offsetY={element.position.y}
              width={boundingRect.width}
              height={boundingRect.height}
            />
          )}
        </ElementContextMenu>
      </MoveableElement>
    </SelectableElement>
  );
};

export default React.memo(PolylineDisplay);
