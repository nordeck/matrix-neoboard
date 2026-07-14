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

import { PointerEvent, PropsWithChildren, useCallback, useRef } from 'react';
import { isMousePositionEqual, MousePosition } from '../../../../lib';
import {
  useWhiteboardSlideInstance,
  WhiteboardSlideInstance,
} from '../../../../state';
import { useLayoutState } from '../../../Layout';
import { WithSelectionProps } from './types';

export type SelectableElementProps = PropsWithChildren<WithSelectionProps>;

export function selectElement(
  slideInstance: WhiteboardSlideInstance,
  shiftKey: boolean,
  elementId: string,
) {
  if (!shiftKey) {
    if (!slideInstance.getActiveElementIds().includes(elementId)) {
      slideInstance.setActiveElementId(elementId);
    }
  } else if (slideInstance.getActiveElementIds().includes(elementId)) {
    slideInstance.unselectActiveElementId(elementId);
  } else {
    slideInstance.addActiveElementId(elementId);
  }
}

export function SelectableElement({
  children,
  elementId,
}: SelectableElementProps) {
  const mousePositionRef = useRef<MousePosition>();
  const touchRef = useRef<{ isPrimary: boolean; time: number }>();
  const slideInstance = useWhiteboardSlideInstance();
  const { activeTool } = useLayoutState();
  const isInSelectionMode = activeTool === 'select';

  const handlePointerDown = useCallback(
    (event: PointerEvent) => {
      if (event.pointerType === 'touch') {
        touchRef.current = {
          isPrimary: event.isPrimary,
          time: Date.now(),
        };
        return;
      }

      if (isInSelectionMode) {
        event.stopPropagation();
        if (event.button === 0) {
          selectElement(slideInstance, event.shiftKey, elementId);
        } else {
          mousePositionRef.current = {
            clientX: event.clientX,
            clientY: event.clientY,
          };
        }
      }
    },
    [elementId, isInSelectionMode, slideInstance],
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent) => {
      if (event.pointerType === 'touch') {
        if (
          touchRef.current &&
          touchRef.current.isPrimary &&
          isInSelectionMode &&
          Date.now() - touchRef.current.time < 300
        ) {
          selectElement(slideInstance, false, elementId);
        }
        touchRef.current = undefined;
        return;
      }

      if (isInSelectionMode) {
        event.stopPropagation();
        if (
          event.button !== 0 &&
          mousePositionRef.current &&
          isMousePositionEqual(mousePositionRef.current, {
            clientX: event.clientX,
            clientY: event.clientY,
          })
        ) {
          selectElement(slideInstance, event.shiftKey, elementId);
        }
      }
    },
    [elementId, isInSelectionMode, slideInstance],
  );

  return (
    <g onPointerDown={handlePointerDown} onPointerUp={handlePointerUp}>
      {children}
    </g>
  );
}
