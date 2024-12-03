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
import { initialWhiteboardWidth } from '../../constants';

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
    // const combinedScale = (1 / canvas.scale) * canvas.outerScale; // something about the "outer scale" isn't right
    // const matrix = new DOMMatrix()
    //   .scale(canvas.outerScale)
    //   .translate(canvas.translate.x, canvas.translate.y)
    //   .scale(1 / canvas.scale);

    console.log("KiB canvas", canvas);
    console.log("KiB",
               "div width", canvasWidth,
               "div height", canvasHeight,
               "viewport-to-div", canvasWidth / initialWhiteboardWidth);

    // transform from canvas coordinates ("5x") to viewport ("1080p")
    const elementOnCanvas = { x, y };
    const matrix = new DOMMatrix();
    // if the canvas is translated to the right, we can see over the left side of the initial viewport.
    // elements within the initial viewport are therefore further to the right.
    matrix.translateSelf(canvas.translate.x, canvas.translate.y);
    console.log("KiB matrix after translate", matrix);
    // if the canvas is scaled to 5, we can see only a 5²th of the canvas.
    // elements at X=500 should be rendered at X=500, instead of X=100 when we can see the whole canvas
    matrix.scaleSelf(canvas.scale);
    console.log("KiB matrix after canvas.scale", matrix);
    matrix.scaleSelf(1/5); // canvas to viewport coordinate scale
    console.log("KiB matrix after canvas-to-viewport", matrix);
    const elementOnViewport = matrix.transformPoint(elementOnCanvas);
    const elementWidthOnViewport = width * 1/5;
    const elementHeightOnViewport = height * 1/5;
    console.log("KiB transform Element to Viewport", {
      "original": {x, y},
      "transformed": elementOnViewport,
      "original size": {width, height},
      "transformed size": {elementWidthOnViewport, elementHeightOnViewport}});

    // find where to place the element bar relative to the element
    const scaleViewportToDiv = canvasWidth / initialWhiteboardWidth;

    // X
    const elementCenterOnViewportX = elementOnViewport.x // left edge of the element
      + (elementWidthOnViewport / 2); // horizontal center of the element
    const elementCenterOnDivX = elementCenterOnViewportX * scaleViewportToDiv; // horizontal center of the element, but in div space
    const elementBarCenterOnDivX = elementCenterOnDivX - elementBarWidth / 2; // horizontal center of the element bar

    // Y
    const elementOnDivY = elementOnViewport.y * scaleViewportToDiv;
    const positionAbove = elementOnDivY - elementBarHeight - offsetOnDiv;
    const positionBelow = elementOnDivY + elementHeightOnViewport * scaleViewportToDiv + offsetOnDiv;
    const positionInElement = elementOnDivY + offsetOnDiv;
    console.log("KiB Y", {
      "elementOnViewportY": elementOnViewport.y,
      "elementOnDivY": elementOnDivY,
      "positionBelow": positionBelow
    });

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
    canvas,
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
