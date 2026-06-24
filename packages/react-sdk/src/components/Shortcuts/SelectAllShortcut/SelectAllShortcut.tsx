/*
 * Copyright 2026 Nordeck IT + Consulting GmbH
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

import { useCallback } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { isInfiniteCanvasMode } from '../../../lib';
import {
  isInfiniteCanvasPresentationEdit,
  useActiveSlideOrFrame,
  usePresentationMode,
  useWhiteboardSlideInstance,
} from '../../../state';
import { HOTKEY_SCOPE_WHITEBOARD } from '../../WhiteboardHotkeysProvider';

export function SelectAllShortcut() {
  const slideInstance = useWhiteboardSlideInstance();
  const { state: presentationState } = usePresentationMode();
  const { activeId } = useActiveSlideOrFrame();

  const isViewingPresentation =
    presentationState.type === 'presentation' && !presentationState.isEditMode;

  const isInfiniteCanvasPresentationMode =
    isInfiniteCanvasPresentationEdit(presentationState) ||
    (isInfiniteCanvasMode() && presentationState.type === 'presenting');

  const handleSelectAll = useCallback(() => {
    if (isViewingPresentation) return;
    const elementIds = slideInstance.getElementIds().filter((id) => {
      const element = slideInstance.getElement(id);
      if (!element) return false;
      if (isInfiniteCanvasPresentationMode) {
        if (element.type === 'frame') return false;
        if (activeId) return element.attachedFrame === activeId;
      }
      return true;
    });

    if (isInfiniteCanvasPresentationMode || elementIds.length > 0) {
      slideInstance.setActiveElementIds(elementIds);
    }
  }, [
    isViewingPresentation,
    isInfiniteCanvasPresentationMode,
    activeId,
    slideInstance,
  ]);

  useHotkeys(
    ['ctrl+a', 'meta+a'],
    handleSelectAll,
    {
      preventDefault: true,
      enableOnContentEditable: true,
      scopes: HOTKEY_SCOPE_WHITEBOARD,
    },
    [handleSelectAll],
  );

  return null;
}
