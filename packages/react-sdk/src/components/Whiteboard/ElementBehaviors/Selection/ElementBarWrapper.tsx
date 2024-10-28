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
  const { scale: canvasScale, translate: canvasTranslate } = useAppSelector(
    (state) => selectCanvas(state),
  );

  if (
    // no elements selected
    elementIds.length === 0 ||
    // modifications are locked
    isLocked
  ) {
    return null;
  }

  const {
    offsetX: elementX,
    offsetY: elementY,
    width: elementWidth,
    height: elementHeight,
  } = calculateBoundingRectForElements(elements);

  const browserHscaling = canvasWidth / 1920;
  const browserVscaling = canvasHeight / 1080;

  // convert canvasTranslate from origin at canvas center to origin at top left
  const canvasTranslateCorrected = {
    x: canvasTranslate.x + (1920 * (1 - canvasScale)) / 2,
    y: canvasTranslate.y + (1080 * (1 - canvasScale)) / 2,
  };

  console.log(
    `MiW elementX ${elementX}, elementY ${elementY}, elementWidth ${elementWidth}, elementHeight ${elementHeight}`,
  );
  console.log(
    `MiW canvasTranslateCorrected(${canvasTranslateCorrected.x}, ${canvasTranslateCorrected.y}) canvasScale(${canvasScale})`,
  );
  console.log(
    `MiW canvasWidth ${canvasWidth} (${browserHscaling}), canvasHeight ${canvasHeight} (${browserVscaling})`,
  );

  const offset = 10;

  function calculateTopPosition() {
    const elementTopPosition =
      (elementY * canvasScale + canvasTranslateCorrected.y) * browserVscaling;
    const positionAbove = elementTopPosition - elementBarHeight - offset;
    const positionBelow =
      elementTopPosition +
      elementHeight * canvasScale * browserVscaling +
      offset;
    const positionInElement = elementTopPosition + offset;

    if (positionAbove >= 0) {
      return positionAbove;
    } else if (positionBelow + elementBarHeight < canvasHeight) {
      return positionBelow;
    } else {
      return positionInElement;
    }
  }

  function calculateLeftPosition() {
    const elementCenterPosition = elementX + elementWidth / 2;
    const position =
      (elementCenterPosition * canvasScale + canvasTranslateCorrected.x) *
        browserHscaling -
      elementBarWidth / 2;
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
}
