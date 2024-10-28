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

  console.log(
    `MiW elementX ${elementX}, elementY ${elementY}, elementWidth ${elementWidth}, elementHeight ${elementHeight}`,
  );
  console.log(
    `MiW canvasTranslate(${canvasTranslate.x}, ${canvasTranslate.y}) canvasScale(${canvasScale})`,
  );

  const offset = 10;

  function calculateTopPosition() {
    const elementTopPosition = elementY * canvasScale + canvasTranslate.y;
    const positionAbove = elementTopPosition - elementBarHeight - offset;
    const positionBelow =
      elementTopPosition + elementHeight * canvasScale + offset;
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
    const position =
      (elementX + elementWidth / 2) * canvasScale -
      elementBarWidth / 2 +
      canvasTranslate.x;
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
