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
import React from 'react';
import { FrameElement } from '../../../state';
import {
  MoveableElement,
  SelectableElement,
  WithExtendedSelectionProps,
} from '../../Whiteboard';

type DisplayProps = FrameElement & WithExtendedSelectionProps;

export const Display: React.FC<DisplayProps> = ({
  elementId,
  active,
  readOnly,
  overrides = {},
  ...frameProps
}) => {
  const theme = useTheme();

  const renderedChild = (
    <g data-testid={`element-frame-${elementId}`}>
      <rect
        x={frameProps.position.x}
        y={frameProps.position.y}
        fill={theme.palette.common.white}
        height={frameProps.height}
        stroke={theme.palette.divider}
        strokeWidth="2"
        width={frameProps.width}
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
        {renderedChild}
      </MoveableElement>
    </SelectableElement>
  );
};

export default React.memo(Display);
