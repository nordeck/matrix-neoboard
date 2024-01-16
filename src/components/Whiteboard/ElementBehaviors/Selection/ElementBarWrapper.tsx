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
import { useSlideIsLocked } from '../../../../state';
import { calculateBoundingRectForElements } from '../../../../state/crdt/documents/elements';
import { useElementOverrides } from '../../../ElementOverridesProvider';
import { useMeasure, useSvgCanvasContext } from '../../SvgCanvas';

export function ElementBarWrapper({
  children,
  elementIds,
}: PropsWithChildren<{ elementIds: string[] }>) {
  const isLocked = useSlideIsLocked();
  const elements = Object.values(useElementOverrides(elementIds));
  const [sizeRef, { width: elementBarWidth, height: elementBarHeight }] =
    useMeasure<HTMLDivElement>();
  const {
    scale,
    width: canvasWidth,
    height: canvasHeight,
  } = useSvgCanvasContext();
  const {
    offsetX: x,
    offsetY: y,
    width,
    height,
  } = calculateBoundingRectForElements(elements);

  const offset = 10;

  function calculateTopPosition() {
    if (elements.length === 0) {
      return 0;
    }
    const position = y * scale;
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
    if (elements.length === 0) {
      return 0;
    }

    const position = (x + width / 2) * scale - elementBarWidth / 2;

    return clamp(position, 0, canvasWidth - elementBarWidth);
  }

  return (
    <>
      {elements.length !== 0 && !isLocked && (
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
