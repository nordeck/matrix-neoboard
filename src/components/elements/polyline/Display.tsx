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
import { getRenderProperties } from './getRenderProperties';

export type PolylineElementProps = PathElement & WithExtendedSelectionProps;

const PolylineDisplay = ({
  readOnly,
  active,
  elementId,
  activeElementIds = [],
  overrides = {},
  ...element
}: PolylineElementProps) => {
  const { strokeColor, strokeWidth, points } = getRenderProperties(element);

  const renderedChild = (
    <g>
      <polyline
        fill="none"
        points={points.map(({ x, y }) => `${x},${y}`).join(' ')}
        stroke={strokeColor}
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
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
        <ElementContextMenu
          elementId={elementId}
          activeElementIds={activeElementIds}
        >
          {renderedChild}
        </ElementContextMenu>
      </MoveableElement>
    </SelectableElement>
  );
};

export default React.memo(PolylineDisplay);
