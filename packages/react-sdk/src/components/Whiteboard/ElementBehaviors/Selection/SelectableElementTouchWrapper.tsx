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

import { PropsWithChildren, TouchEvent, useCallback, useRef } from 'react';
import { useWhiteboardSlideInstance } from '../../../../state';
import { useLayoutState } from '../../../Layout';

const TAP_MS = 300;

const SelectableElementTouchWrapper: React.FC<
  PropsWithChildren<{ elementId: string }>
> = ({ children, elementId }) => {
  const touchref = useRef(0);
  const touchMs = useRef(0);

  const slideInstance = useWhiteboardSlideInstance();
  const { activeTool } = useLayoutState();

  const isInSelectionMode = activeTool === 'select';

  const handleTouchStart = useCallback((event: TouchEvent) => {
    touchref.current = event.touches.length;
    touchMs.current = Date.now();
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchref.current !== 1) return;
    if (!isInSelectionMode) return;
    if (Date.now() - touchMs.current > TAP_MS) return;

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

    selectElement(false);
  }, [elementId, isInSelectionMode, slideInstance]);

  return (
    <g onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {children}
    </g>
  );
};

export default SelectableElementTouchWrapper;
