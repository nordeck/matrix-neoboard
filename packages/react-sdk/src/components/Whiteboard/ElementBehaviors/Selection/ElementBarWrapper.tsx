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
  Element,
  useSlideIsLocked,
} from '../../../../state';
import { useElementOverrides } from '../../../ElementOverridesProvider';
import { useMeasure } from '../../SvgCanvas';
import { useSvgScaleContext } from '../../SvgScaleContext';
import { infiniteCanvasMode } from '../../constants';
import { calculateBoundaryWithRotationHandleForElements } from '../Rotatable/rotatorMath';

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
  } = calculateBoundingRectForElements(elements);

  const rotatedBoundary = calculateBoundaryWithRotationHandleForElements(
    elements,
    scale,
  );

  const offset = 10;

  function calculateTopPosition() {
    const position = y * scale;
    const positionInElement = position + offset;

    let positionAbove = position - elementBarHeight - offset;
    let positionBelow = position + height * scale + offset;

    // adjust if the object is rotateable
    if (rotatedBoundary) {
      positionAbove = Math.min(
        positionAbove,
        rotatedBoundary.min.y * scale - elementBarHeight - offset * 2,
      );
      positionBelow = Math.max(
        positionBelow,
        rotatedBoundary.max.y * scale + offset * 2,
      );
    }

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
  const { containerDimensions } = useSvgScaleContext();

  const {
    offsetX: x,
    offsetY: y,
    width,
    height,
  } = calculateBoundingRectForElements(elements);

  const offsetOnDiv = 10;
  const { scale, transformPointSvgToContainer } = useSvgScaleContext();

  const getBoundariesWhenRotatedInContainer = (
    elements: Element[],
    scale: number,
  ) => {
    const { max, min } =
      calculateBoundaryWithRotationHandleForElements(elements, scale) || {};
    if (max && min) {
      const boundaryMax = transformPointSvgToContainer(max);
      const boundaryMin = transformPointSvgToContainer(min);
      return {
        boundaryMax,
        boundaryMin,
      };
    }
    // not rotated or can't calculate at this time
    return void 0;
  };

  const boundariesWhenRotated = getBoundariesWhenRotatedInContainer(
    elements,
    scale,
  );
  const boundaryRotMinY = boundariesWhenRotated
    ? boundariesWhenRotated.boundaryMin.y
    : void 0;
  const boundaryRotMaxY = boundariesWhenRotated
    ? boundariesWhenRotated.boundaryMax.y
    : void 0;

  const position = useMemo(() => {
    const elementOnContainer = transformPointSvgToContainer({ x, y });

    const elementWidthOnDiv = width * scale;
    const elementHeightOnDiv = height * scale;

    // X
    const elementCenterOnDivX = elementOnContainer.x + elementWidthOnDiv / 2;
    const elementBarCenterOnDivX = elementCenterOnDivX - elementBarWidth / 2;

    const maxX = containerDimensions.width - elementBarWidth;
    const clampedPositionX = clamp(elementBarCenterOnDivX, 0, maxX);

    // Y
    let positionAbove = elementOnContainer.y - elementBarHeight - offsetOnDiv;
    let positionBelow = elementOnContainer.y + elementHeightOnDiv + offsetOnDiv;

    // adjust for rotated object
    if (boundaryRotMinY !== undefined && boundaryRotMaxY !== undefined) {
      positionAbove = Math.min(
        positionAbove,
        boundaryRotMinY - elementBarHeight - offsetOnDiv * 2,
      );
      positionBelow = Math.max(
        positionBelow,
        boundaryRotMaxY + offsetOnDiv * 2,
      );
    }

    let newYPosition: number;
    if (positionAbove >= 0) {
      newYPosition = positionAbove;
    } else if (positionBelow + elementBarHeight < containerDimensions.height) {
      newYPosition = positionBelow;
    } else {
      newYPosition = elementOnContainer.y + offsetOnDiv;
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
    boundaryRotMinY,
    boundaryRotMaxY,
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
