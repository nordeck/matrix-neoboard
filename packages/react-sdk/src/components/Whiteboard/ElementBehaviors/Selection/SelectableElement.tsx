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

import { MouseEvent, PropsWithChildren, useRef } from 'react';
import { isMousePositionEqual, MousePosition } from '../../../../lib';
import { useWhiteboardSlideInstance } from '../../../../state';
import { useLayoutState } from '../../../Layout';
import { WithSelectionProps } from './types';

export type SelectableElementProps = PropsWithChildren<WithSelectionProps>;

export function SelectableElement({
  children,
  elementId,
}: SelectableElementProps) {
  const mousePositionRef = useRef<MousePosition>();
  const slideInstance = useWhiteboardSlideInstance();
  const { activeTool } = useLayoutState();
  const isInSelectionMode = activeTool === 'select';

  function selectElement(shiftKey: boolean) {
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

  function handleMouseDown(event: MouseEvent) {
    if (isInSelectionMode) {
      event.stopPropagation();
      if (event.button === 0) {
        selectElement(event.shiftKey);
      } else {
        mousePositionRef.current = {
          clientX: event.clientX,
          clientY: event.clientY,
        };
      }
    }
  }

  function handleMouseUp(event: MouseEvent) {
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
        selectElement(event.shiftKey);
      }
    }
  }

  return (
    <g onMouseDown={handleMouseDown} onMouseUp={handleMouseUp}>
      {children}
    </g>
  );
}
