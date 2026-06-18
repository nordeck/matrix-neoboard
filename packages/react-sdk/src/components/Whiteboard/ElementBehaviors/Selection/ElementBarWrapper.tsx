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
import clamp from 'lodash/clamp';
import React, { PropsWithChildren, useMemo } from 'react';
import {
  BoundingRect,
  calculateBoundingRectForElements,
  Element,
  isRotatableElement,
  useSlideIsLocked,
} from '../../../../state';
import { useElementOverrides } from '../../../ElementOverridesProvider';
import { useMeasure } from '../../SvgCanvas';
import { useSvgScaleContext } from '../../SvgScaleContext';
import { infiniteCanvasMode } from '../../constants';
import { calculateBoundingRectForElementWithRotationHandle } from './utils';

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

  const Wrapper: React.FC<ElementBarWrapperProps> = infiniteCanvasMode
    ? InfiniteElementBarWrapper
    : FiniteElementBarWrapper;

  return <Wrapper elementIds={elementIds}>{children}</Wrapper>;
}

const FiniteElementBarWrapper: React.FC<ElementBarWrapperProps> = ({
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
  } = calculateBoundingRectWithRotationHandle(elements, scale);

  const offset = elementIds.length === 1 ? 20 : 10;

  function calculateTopPosition() {
    const position = y * scale;
    const position1 = (y + height) * scale;
    const positionInElement = position + offset;

    const positionAbove = position - elementBarHeight - offset;
    const positionBelow = position1 + offset;

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
const InfiniteElementBarWrapper: React.FC<ElementBarWrapperProps> = ({
  children,
  elementIds,
}) => {
  const elements = Object.values(useElementOverrides(elementIds));
  const [sizeRef, { width: elementBarWidth, height: elementBarHeight }] =
    useMeasure<HTMLDivElement>();
  const {
    scale,
    transformPointSvgToContainer,
    containerDimensions: { width: containerWidth, height: containerHeight },
  } = useSvgScaleContext();

  const {
    offsetX: x,
    offsetY: y,
    width,
    height,
  } = calculateBoundingRectWithRotationHandle(elements, scale);

  const offset = elementIds.length === 1 ? 20 : 10;

  const position = useMemo(() => {
    const { x: cx, y: cy } = transformPointSvgToContainer({ x, y });
    const { y: c1y } = transformPointSvgToContainer({
      x: x + width,
      y: y + height,
    });

    // X
    const leftPosition = clamp(
      cx + (width * scale) / 2 - elementBarWidth / 2,
      0,
      containerWidth - elementBarWidth,
    );

    // Y
    const positionAbove = cy - elementBarHeight - offset;
    const positionBelow = c1y + offset;

    let topPosition: number;
    if (positionAbove >= 0) {
      topPosition = positionAbove;
    } else if (positionBelow + elementBarHeight < containerHeight) {
      topPosition = positionBelow;
    } else {
      topPosition = c1y + offset;
    }

    return {
      left: leftPosition,
      top: topPosition,
    };
  }, [
    x,
    y,
    width,
    height,
    offset,
    transformPointSvgToContainer,
    scale,
    elementBarWidth,
    elementBarHeight,
    containerWidth,
    containerHeight,
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

function calculateBoundingRectWithRotationHandle(
  elements: Element[],
  scale: number,
): BoundingRect {
  if (elements.length === 1 && isRotatableElement(elements[0])) {
    return calculateBoundingRectForElementWithRotationHandle(
      elements[0],
      scale,
    );
  } else {
    return calculateBoundingRectForElements(elements);
  }
}
