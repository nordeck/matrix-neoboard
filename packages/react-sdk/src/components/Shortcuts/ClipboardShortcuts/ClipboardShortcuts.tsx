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

import { useWidgetApi } from '@matrix-widget-toolkit/react';
import { useCallback, useEffect } from 'react';
import { useHotkeysContext } from 'react-hotkeys-hook';
import {
  calculateBoundingRectForElements,
  clampElementPosition,
  Point,
  usePresentationMode,
  useWhiteboardSlideInstance,
} from '../../../state';
import { useImageUpload } from '../../ImageUpload';
import { addImagesToSlide } from '../../ImageUpload/addImagesToSlide';
import { defaultAcceptedImageTypesArray } from '../../ImageUpload/consts';
import {
  useSvgScaleContext,
  whiteboardHeight,
  whiteboardWidth,
} from '../../Whiteboard';
import { HOTKEY_SCOPE_WHITEBOARD } from '../../WhiteboardHotkeysProvider';
import {
  ClipboardContent,
  deserializeFromClipboard,
  serializeToClipboard,
} from './serialization';

// Clipboard API: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/clipboard
//
// /!\ We don't use the clipboard API as it is (in beginning of 2023) not
// supported by all major browsers. Firefox provides write access to the
// clipboard, but no read access using the clipboard API. Even with a polyfill,
// full support is not possible for Firefox:
// https://github.com/lgarron/clipboard-polyfill/tree/c24845e280262858cf40c5fce8443abf5a8dc51b#compatibility
//
// Therefore we use the "old school" access to the clipboard using the browser
// copy, cut, and paste events. As these are events on their own, we can't use
// them together with useHotkeys. The keyboard shortcuts are based on what the
// browser is using.

export function ClipboardShortcuts() {
  // Do avoid issues where users are interacting the the content editable part
  // of the whiteboard canvas, we should disable our listeners.
  const { activeScopes } = useHotkeysContext();
  const enableShortcuts = activeScopes.includes(HOTKEY_SCOPE_WHITEBOARD);
  const slideInstance = useWhiteboardSlideInstance();
  const { state: presentationState } = usePresentationMode();
  const isViewingPresentation = presentationState.type === 'presentation';
  const widgetApi = useWidgetApi();
  const { handleDrop } = useImageUpload();
  const { viewportCanvasCenter } = useSvgScaleContext();

  // Copy event is triggered by the default keyboard shortcut for copying in the
  // browser, usually Ctrl/Meta+C
  useEffect(() => {
    const handler = (event: ClipboardEvent) => {
      if (!enableShortcuts) {
        return;
      }

      if (isViewingPresentation || slideInstance.isLocked()) {
        return;
      }

      const activeElementIds = slideInstance.getActiveElementIds();

      if (activeElementIds.length === 0) {
        return;
      }

      const orderedActiveElementIds =
        slideInstance.sortElementIds(activeElementIds);
      const activeElements = slideInstance.getElements(orderedActiveElementIds);

      if (Object.keys(activeElements).length === 0) {
        return;
      }

      const content = serializeToClipboard({
        elements: Object.values(activeElements),
      });
      writeIntoClipboardData(event.clipboardData, content);
      event.preventDefault();
    };

    // We register the event handlers globally. While we could listen on a
    // specific element, this would require that the element, or a child of it
    // has focus. When pasting we will probably not have focus and the focus of
    // the selected element is lost once we interact with other UI elements.
    document.addEventListener('copy', handler);
    return () => document.removeEventListener('copy', handler);
  }, [enableShortcuts, isViewingPresentation, slideInstance]);

  // Cut event is triggered by the default keyboard shortcut for cutting in the
  // browser, usually Ctrl/Meta+X
  useEffect(() => {
    const handler = (event: ClipboardEvent) => {
      if (!enableShortcuts) {
        return;
      }

      if (isViewingPresentation || slideInstance.isLocked()) {
        return;
      }

      const activeElementIds = slideInstance.getActiveElementIds();

      if (activeElementIds.length === 0) {
        return;
      }

      const orderedActiveElementIds =
        slideInstance.sortElementIds(activeElementIds);
      const activeElements = slideInstance.getElements(orderedActiveElementIds);

      if (Object.keys(activeElements).length === 0) {
        return;
      }

      const content = serializeToClipboard({
        elements: Object.values(activeElements),
      });
      writeIntoClipboardData(event.clipboardData, content);
      slideInstance.removeElements(activeElementIds);
      event.preventDefault();
    };

    document.addEventListener('cut', handler);
    return () => document.removeEventListener('cut', handler);
  }, [enableShortcuts, isViewingPresentation, slideInstance]);

  const handlePasteImages = useCallback(
    async (files: File[], centerPosition: Point) => {
      const results = await handleDrop(files);

      const images = results
        .filter((result) => result.status === 'fulfilled')
        .map((result) => result.value);

      addImagesToSlide(slideInstance, images, centerPosition);
    },
    [handleDrop, slideInstance],
  );

  // Paste event is triggered by the default keyboard shortcut for pasting in
  // the browser, usually Ctrl/Meta+V
  useEffect(() => {
    const handler = async (event: ClipboardEvent) => {
      if (!enableShortcuts) {
        return;
      }

      if (isViewingPresentation || slideInstance.isLocked()) {
        return;
      }

      const content = readFromClipboardData(event.clipboardData);
      const { elements } = deserializeFromClipboard(content);

      const centerPosition =
        slideInstance.getCursorPosition() ?? viewportCanvasCenter;

      if (elements && elements.length > 0) {
        const { offsetX, offsetY, width, height } =
          calculateBoundingRectForElements(elements);
        const position: Point = {
          x: centerPosition.x - width / 2,
          y: centerPosition.y - height / 2,
        };
        const positionClamp = clampElementPosition(
          position,
          { width, height },
          { width: whiteboardWidth, height: whiteboardHeight },
        );
        const newElements = elements.map((element) => ({
          ...element,
          position: {
            x: positionClamp.x + (element.position.x - offsetX),
            y: positionClamp.y + (element.position.y - offsetY),
          },
        }));
        const pastedElementIds = slideInstance.addElements(newElements);
        slideInstance.setActiveElementIds(pastedElementIds);
      }

      // Handle image files
      const files = event.clipboardData?.files;
      if (files && files.length > 0) {
        const imageFiles = Array.from(files).filter((file) =>
          defaultAcceptedImageTypesArray.includes(file.type),
        );

        if (imageFiles.length > 0) {
          handlePasteImages(imageFiles, centerPosition);
        }
      }
    };

    document.addEventListener('paste', handler);
    return () => document.removeEventListener('paste', handler);
  }, [
    enableShortcuts,
    handlePasteImages,
    isViewingPresentation,
    slideInstance,
    widgetApi,
    viewportCanvasCenter,
  ]);

  return null;
}

function writeIntoClipboardData(
  clipboardData: DataTransfer | null,
  content: ClipboardContent,
): void {
  if (!clipboardData) {
    return;
  }

  Object.entries(content).forEach(([type, value]) =>
    clipboardData.setData(type, value),
  );
}

function readFromClipboardData(
  clipboardData: DataTransfer | null,
): ClipboardContent {
  if (!clipboardData) {
    return {};
  }

  return {
    'text/plain': clipboardData.getData('text/plain'),
    'text/html': clipboardData.getData('text/html'),
  };
}
