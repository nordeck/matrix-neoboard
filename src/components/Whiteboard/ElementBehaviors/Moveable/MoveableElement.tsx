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
import {
  PropsWithChildren,
  RefObject,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import { DraggableCore, DraggableData, DraggableEvent } from 'react-draggable';
import { useUnmount } from 'react-use';
import {
  // useActiveElements,
  useWhiteboardSlideInstance,
} from '../../../../state';
import {
  createResetElementOverrides,
  useElementOverrides,
  useSetElementOverride,
} from '../../../ElementOverridesProvider';
import { useLayoutState } from '../../../Layout';
import { snapToGrid } from '../../Grid';
import { useSvgCanvasContext } from '../../SvgCanvas';
import { gridCellSize } from '../../constants';
import { addUserSelectStyles, removeUserSelectStyles } from './DraggableStyles';
import { calculateElementOverrideUpdates } from './utils';

const DraggableGroup = styled('g')({
  cursor: 'move',
});

export type MoveableElementProps = PropsWithChildren<{
  elementId: string;
}>;

export function MoveableElement({ children, elementId }: MoveableElementProps) {
  //const { activeElementIds } = useActiveElements();

  const activeElementIds: string[] = useMemo(() => {
    return [];
  }, []);

  const elements = useElementOverrides(activeElementIds);
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
      setElementOverride(createResetElementOverrides([elementId]));
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

      setElementOverride(
        calculateElementOverrideUpdates(
          elements,
          data.deltaX,
          data.deltaY,
          viewportWidth,
          viewportHeight,
        ),
      );
    },
    [setElementOverride, viewportHeight, viewportWidth, elements],
  );

  const handleStop = useCallback(() => {
    setElementOverride(createResetElementOverrides(Object.keys(elements)));

    if (deltaX !== 0 || deltaY !== 0) {
      slideInstance.updateElements(
        Object.entries(elements).map(([elementId, element]) => {
          const x = isShowGrid
            ? snapToGrid(element.position.x, gridCellSize)
            : element.position.x;
          const y = isShowGrid
            ? snapToGrid(element.position.y, gridCellSize)
            : element.position.y;

          return {
            elementId,
            patch: { position: { x, y } },
          };
        }),
      );
    }

    isDragging.current = false;
    removeUserSelectStyles();
  }, [deltaX, deltaY, isShowGrid, setElementOverride, slideInstance, elements]);

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
