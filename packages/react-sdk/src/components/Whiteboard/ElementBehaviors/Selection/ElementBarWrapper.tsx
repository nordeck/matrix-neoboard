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
import { whiteboardWidth, whiteboardHeight, initialWhiteboardWidth, initialWhiteboardHeight } from '../../constants';

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

  const offsetOnDiv = 10;
  // eslint-disable-next-line
  const canvas = useAppSelector(selectCanvas);

  // eslint-disable-next-line
  const position = useMemo(() => {
    const elementOnCanvas = {x, y};
    console.log("KiB", "element", elementOnCanvas)
    const matrix = new DOMMatrix();
    matrix.translateSelf(canvas.translate.x, canvas.translate.y);
    console.log("KiB", "matrix translate", matrix)
    matrix.scaleSelf(canvas.scale);
    console.log("KiB", "matrix translate+scale", matrix)
    const elementOnDiv = matrix.transformPoint(elementOnCanvas);
    console.log("KiB", "elementOnDiv", elementOnDiv)
    const elementWidthOnDiv = width * canvas.scale;
    const elementHeightOnDiv = height * canvas.scale;
    //console.log("KiB", "element size", elementWidthOnDiv, elementHeightOnDiv)







    const elementManualOnDivX = x * canvas.scale + canvas.translate.x * canvas.scale;
    console.log("KiB", "elementManualOnDivX", elementManualOnDivX)
    const elementCenterOnDivX = elementManualOnDivX + elementWidthOnDiv/2;
    const elementBarCenterOnDivX = elementCenterOnDivX - elementBarWidth / 2; // horizontal center of the element bar

    // Y
    const positionAbove = elementOnDiv.y - elementBarHeight - offsetOnDiv;
    const positionBelow = elementOnDiv.y + elementHeightOnDiv + offsetOnDiv;
    const positionInElement = elementOnDiv.y + offsetOnDiv;

    // adjust the element bar position depending on the window ("div") size
    const clampedPositionX = clamp(elementBarCenterOnDivX, 0, canvasWidth - elementBarWidth);

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
