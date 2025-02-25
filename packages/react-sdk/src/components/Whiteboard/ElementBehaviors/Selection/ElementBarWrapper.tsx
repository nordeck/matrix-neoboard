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
import { PropsWithChildren, useMemo } from 'react';
import { transformedPointSvgToDiv } from '../../../../lib';
import { useSlideIsLocked } from '../../../../state';
import { calculateBoundingRectForElements } from '../../../../state/crdt/documents/elements';
import { useElementOverrides } from '../../../ElementOverridesProvider';
import { useMeasure, useSvgCanvasContext } from '../../SvgCanvas';
import { useSvgScaleContext } from '../../SvgScaleContext';

export function ElementBarWrapper({
  children,
  elementIds,
}: PropsWithChildren<{ elementIds: string[] }>) {
  const isLocked = useSlideIsLocked();
  const elements = Object.values(useElementOverrides(elementIds));
  const [sizeRef, { width: elementBarWidth, height: elementBarHeight }] =
    useMeasure<HTMLDivElement>();
  const { height: canvasHeight } = useSvgCanvasContext();

  if (
    // no elements selected
    elementIds.length === 0 ||
    // modifications are locked
    isLocked
  ) {
    return null;
  }

  const {
    offsetX: x,
    offsetY: y,
    width,
    height,
  } = calculateBoundingRectForElements(elements);

  const offsetOnDiv = 10;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const canvas = useSvgScaleContext();

  // eslint-disable-next-line
  const position = useMemo(() => {
    const elementOnCanvas = { x, y };
    const elementOnDiv = transformedPointSvgToDiv(canvas, elementOnCanvas);

    const elementWidthOnDiv = width * canvas.scale;
    const elementHeightOnDiv = height * canvas.scale;

    const elementCenterOnDivX = elementOnDiv.x + elementWidthOnDiv / 2;
    const elementBarCenterOnDivX = elementCenterOnDivX - elementBarWidth / 2;

    // Y
    const positionAbove = elementOnDiv.y - elementBarHeight - offsetOnDiv;
    const positionBelow = elementOnDiv.y + elementHeightOnDiv + offsetOnDiv;
    const positionInElement = elementOnDiv.y + offsetOnDiv;

    // TODO clamp - ignored for infinite-canvas spike
    const clampedPositionX = elementBarCenterOnDivX;

    let newYPosition = positionInElement;
    if (positionAbove >= 0) {
      newYPosition = positionAbove;
    } else if (positionBelow + elementBarHeight < canvasHeight) {
      newYPosition = positionBelow;
    }

    return {
      left: clampedPositionX,
      top: newYPosition,
    };
  }, [
    x,
    y,
    canvas,
    width,
    height,
    elementBarWidth,
    elementBarHeight,
    canvasHeight,
  ]);

  return (
    <Box
      ref={sizeRef}
      position="absolute"
      zIndex={(theme) => theme.zIndex.appBar}
      {...position}
    >
      {children}
    </Box>
  );
}
