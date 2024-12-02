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
import { PropsWithChildren, useMemo } from 'react';
import { useSlideIsLocked } from '../../../../state';
import { calculateBoundingRectForElements } from '../../../../state/crdt/documents/elements';
import { selectCanvas } from '../../../../store/canvasSlice';
import { useAppSelector } from '../../../../store/reduxToolkitHooks';
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
  const { width: canvasWidth, height: canvasHeight } = useSvgCanvasContext();

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

  const offset = 10;
  // eslint-disable-next-line
  const canvas = useAppSelector(selectCanvas);

  // eslint-disable-next-line
  const position = useMemo(() => {
    const combinedScale = (1 / canvas.scale) * canvas.outerScale;
    const matrix = new DOMMatrix()
      .scale(canvas.outerScale)
      .translate(canvas.translate.x, canvas.translate.y)
      .scale(1 / canvas.scale);

    // X
    const transformedX = matrix.transformPoint({ x }).x;
    const positionX =
      transformedX + (width / 2) * combinedScale - elementBarWidth / 2;
    const clampedPositionX = clamp(positionX, 0, canvasWidth - elementBarWidth);

    // Y
    const positionY = matrix.transformPoint({ y }).y;
    const positionAbove = positionY - elementBarHeight - offset;
    const positionBelow = positionY + height * combinedScale + offset;
    const positionInElement = positionY + offset;

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
    canvas.outerScale,
    canvas.translate.x,
    canvas.translate.y,
    canvas.scale,
    x,
    width,
    elementBarWidth,
    canvasWidth,
    y,
    elementBarHeight,
    height,
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
