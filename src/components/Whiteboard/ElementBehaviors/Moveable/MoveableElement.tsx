/*
 * Copyright 2022 Nordeck IT + Consulting GmbH
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

import { styled } from '@mui/material';
import { clamp } from 'lodash';
import {
  PropsWithChildren,
  RefObject,
  useCallback,
  useRef,
  useState,
} from 'react';
import { DraggableCore, DraggableData, DraggableEvent } from 'react-draggable';
import { useUnmount } from 'react-use';
import { Element, useWhiteboardSlideInstance } from '../../../../state';
import { useSetElementOverride } from '../../../ElementOverridesProvider';
import { useLayoutState } from '../../../Layout';
import { snapToGrid } from '../../Grid';
import { useSvgCanvasContext } from '../../SvgCanvas';
import { gridCellSize } from '../../constants';
import { addUserSelectStyles, removeUserSelectStyles } from './DraggableStyles';

const DraggableGroup = styled('g')({
  cursor: 'move',
});

export type MoveableElementProps = PropsWithChildren<
  Element & {
    elementId: string;
    customWidth: number;
    customHeight: number;
  }
>;

export function MoveableElement({
  children,
  elementId,
  customWidth,
  customHeight,
  ...element
}: MoveableElementProps) {
  const { isShowGrid } = useLayoutState();
  const isDragging = useRef<boolean>(false);
  const nodeRef = useRef<SVGRectElement>(null);
  const setElementOverride = useSetElementOverride();
  const { scale, viewportHeight, viewportWidth } = useSvgCanvasContext();
  const slideInstance = useWhiteboardSlideInstance();

  const [{ deltaX, deltaY }, setDelta] = useState({ deltaX: 0, deltaY: 0 });

  useUnmount(() => {
    if (isDragging.current) {
      removeUserSelectStyles();
      setElementOverride(elementId, undefined);
    }
  });

  const handleStart = useCallback(() => {
    isDragging.current = true;
    addUserSelectStyles();
    setDelta({ deltaX: 0, deltaY: 0 });
  }, []);

  const handleDrag = useCallback(
    (_: DraggableEvent, data: DraggableData) => {
      setDelta((old) => ({
        deltaX: old.deltaX + data.deltaX,
        deltaY: old.deltaY + data.deltaY,
      }));

      const x = element.position.x + data.deltaX;
      const y = element.position.y + data.deltaY;

      setElementOverride(elementId, {
        position: {
          x: clamp(x, 0, viewportWidth - 1 - customWidth),
          y: clamp(y, 0, viewportHeight - 1 - customHeight),
        },
      });
    },
    [
      customHeight,
      customWidth,
      element.position.x,
      element.position.y,
      elementId,
      setElementOverride,
      viewportHeight,
      viewportWidth,
    ]
  );

  const handleStop = useCallback(() => {
    setElementOverride(elementId, undefined);

    if (deltaX !== 0 || deltaY !== 0) {
      const x = isShowGrid
        ? snapToGrid(element.position.x, gridCellSize)
        : element.position.x;
      const y = isShowGrid
        ? snapToGrid(element.position.y, gridCellSize)
        : element.position.y;

      slideInstance.updateElement(elementId, { position: { x, y } });
    }

    isDragging.current = false;
    removeUserSelectStyles();
  }, [
    deltaX,
    deltaY,
    element.position.x,
    element.position.y,
    elementId,
    isShowGrid,
    setElementOverride,
    slideInstance,
  ]);

  return (
    <DraggableCore
      // disable the hack since we already added it via <DraggableStyles>.
      enableUserSelectHack={false}
      nodeRef={nodeRef as unknown as RefObject<HTMLElement>}
      onDrag={handleDrag}
      onStop={handleStop}
      onStart={handleStart}
      scale={scale}
    >
      <DraggableGroup ref={nodeRef}>{children}</DraggableGroup>
    </DraggableCore>
  );
}
