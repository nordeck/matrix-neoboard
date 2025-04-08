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
import React, { PropsWithChildren, useMemo } from 'react';
import {
  calculateBoundingRectForElements,
  useSlideIsLocked,
} from '../../../../state';
import { useElementOverrides } from '../../../ElementOverridesProvider';
import { useMeasure } from '../../SvgCanvas';
import { useSvgScaleContext } from '../../SvgScaleContext';
import {
  infiniteCanvasMode,
  whiteboardHeight,
  whiteboardWidth,
} from '../../constants';

type ElementBarWrapperProps = PropsWithChildren<{ elementIds: string[] }>;

export function ElementBarWrapper({
  children,
  elementIds,
}: ElementBarWrapperProps) {
  const isLocked = useSlideIsLocked();

  if (
    // no elements selected
    elementIds.length === 0 ||
    // modifications are locked
    isLocked
  ) {
    return null;
  }

  const Wrapper: React.FC<ElementBarWrapperProps> = !infiniteCanvasMode
    ? ElementBarWrapperWrapper
    : ElementBarWrapperPositionedWrapper;

  return <Wrapper elementIds={elementIds}>{children}</Wrapper>;
}

const ElementBarWrapperWrapper: React.FC<ElementBarWrapperProps> = ({
  children,
  elementIds,
}) => {
  const elements = Object.values(useElementOverrides(elementIds));
  const [sizeRef, { width: elementBarWidth, height: elementBarHeight }] =
    useMeasure<HTMLDivElement>();
  const {
    scale,
    containerDimensions: { width: canvasWidth, height: canvasHeight },
  } = useSvgScaleContext();

  const {
    offsetX: x,
    offsetY: y,
    width,
    height,
  } = calculateBoundingRectForElements(elements);

  const offset = 10;

  function calculateTopPosition() {
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
    const position = (x + width / 2) * scale - elementBarWidth / 2;
    return clamp(position, 0, canvasWidth - elementBarWidth);
  }

  return (
    <Box
      ref={sizeRef}
      position="absolute"
      zIndex={(theme) => theme.zIndex.appBar}
      left={calculateLeftPosition()}
      top={calculateTopPosition()}
    >
      {children}
    </Box>
  );
};

/**
 * This component handles the actual positioning of the ElementBar.
 */
const ElementBarWrapperPositionedWrapper: React.FC<ElementBarWrapperProps> = ({
  children,
  elementIds,
}) => {
  const elements = Object.values(useElementOverrides(elementIds));
  const [sizeRef, { width: elementBarWidth, height: elementBarHeight }] =
    useMeasure<HTMLDivElement>();
  const { containerDimensions } = useSvgScaleContext();

  const {
    offsetX: x,
    offsetY: y,
    width,
    height,
  } = calculateBoundingRectForElements(elements);

  const offsetOnDiv = 10;
  const { scale, transformPointSvgToContainer } = useSvgScaleContext();

  const position = useMemo(() => {
    const pointOnSvg = { x, y };
    const elementOnContainer = transformPointSvgToContainer(pointOnSvg);

    const elementWidthOnDiv = width * scale;
    const elementHeightOnDiv = height * scale;

    // X
    const elementCenterOnDivX = elementOnContainer.x + elementWidthOnDiv / 2;
    const elementBarCenterOnDivX = elementCenterOnDivX - elementBarWidth / 2;

    /**
     * Min and max need half of the whiteboard width to be added,
     * because when rendering the SVG everything is shifted half a width.
     * {@see SvgCanvas}
     */
    const minX = whiteboardWidth / 2;
    const maxX =
      containerDimensions.width - elementBarWidth + whiteboardWidth / 2;
    const clampedPositionX = clamp(elementBarCenterOnDivX, minX, maxX);

    // Y
    const positionAbove = elementOnContainer.y - elementBarHeight - offsetOnDiv;
    const positionBelow =
      elementOnContainer.y + elementHeightOnDiv + offsetOnDiv;
    const positionInElement = elementOnContainer.y + offsetOnDiv;

    let newYPosition = positionInElement;
    /**
     * The above position has to be checked against the whiteboardHeight / 2,
     * because when rendering the SVG everything is shifted half a width.
     * {@see SvgCanvas}
     */
    if (positionAbove >= whiteboardHeight / 2) {
      newYPosition = positionAbove;
    } else if (positionBelow + elementBarHeight < containerDimensions.height) {
      newYPosition = positionBelow;
    } else {
      newYPosition = positionInElement;
    }

    return {
      left: clampedPositionX,
      top: newYPosition,
    };
  }, [
    x,
    y,
    transformPointSvgToContainer,
    width,
    scale,
    height,
    elementBarWidth,
    elementBarHeight,
    containerDimensions.width,
    containerDimensions.height,
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
};
