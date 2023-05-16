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

import { Box } from '@mui/material';
import { clamp } from 'lodash';
import { PropsWithChildren } from 'react';
import {
  calculateBoundingRectForPoints,
  useSlideIsLocked,
} from '../../../../state';
import { useElementOverride } from '../../../ElementOverridesProvider';
import { useMeasure, useSvgCanvasContext } from '../../SvgCanvas';

export function ElementBarWrapper({
  children,
  elementId,
}: PropsWithChildren<{ elementId: string }>) {
  const isLocked = useSlideIsLocked();
  const element = useElementOverride(elementId);
  const [sizeRef, { width: elementBarWidth, height: elementBarHeight }] =
    useMeasure<HTMLDivElement>();
  const {
    scale,
    width: canvasWidth,
    height: canvasHeight,
  } = useSvgCanvasContext();
  const width =
    element?.type === 'path'
      ? calculateBoundingRectForPoints(element.points).width
      : element?.width ?? 0;
  const height =
    element?.type === 'path'
      ? calculateBoundingRectForPoints(element.points).height
      : element?.height ?? 0;
  const offset = 10;

  function calculateTopPosition() {
    if (!element) {
      return 0;
    }
    const position = element.position.y * scale;
    const positionAbove = position - elementBarHeight - offset;
    const positionBelow = position + height * scale + offset;
    const positionInElement = position + offset;

    if (positionAbove >= 0) {
      return positionAbove;
    } else if (positionBelow + elementBarHeight < canvasHeight) {
      return positionBelow;
    } else {
      return positionInElement;
    }
  }

  function calculateLeftPosition() {
    if (!element) {
      return 0;
    }

    const position =
      (element.position.x + width / 2) * scale - elementBarWidth / 2;

    return clamp(position, 0, canvasWidth - elementBarWidth);
  }

  return (
    <>
      {element && !isLocked && (
        <Box
          ref={sizeRef}
          position="absolute"
          zIndex={(theme) => theme.zIndex.appBar}
          left={calculateLeftPosition()}
          top={calculateTopPosition()}
        >
          {children}
        </Box>
      )}
    </>
  );
}
