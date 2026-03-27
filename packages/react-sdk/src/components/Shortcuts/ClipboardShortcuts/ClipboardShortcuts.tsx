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
  copyElementWithAttachedFrame,
  Element,
  Elements,
  modifyElementPosition,
  Point,
  Size,
  usePresentationMode,
  useWhiteboardSlideInstance,
} from '../../../state';
import { useImageUpload } from '../../ImageUpload';
import {
  addImagesToSlide,
  ImageToAddData,
} from '../../ImageUpload/addImagesToSlide';
import { defaultAcceptedImageTypesArray } from '../../ImageUpload/consts';
import {
  initPDFJs,
  loadPDF,
  renderPDFToImages,
} from '../../ImportWhiteboardDialog/pdfImportUtils';
import {
  useSvgScaleContext,
  whiteboardHeight,
  whiteboardWidth,
} from '../../Whiteboard';
import { HOTKEY_SCOPE_WHITEBOARD } from '../../WhiteboardHotkeysProvider';
import { selectActiveAndAttachedOrderedElements } from '../utils';
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

      const selectedElements =
        selectActiveAndAttachedOrderedElements(slideInstance);

      if (Object.keys(selectedElements).length === 0) {
        return;
      }

      const content = serializeToClipboard({
        elements: selectedElements,
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

      const selectedElements =
        selectActiveAndAttachedOrderedElements(slideInstance);

      if (Object.keys(selectedElements).length === 0) {
        return;
      }

      const content = serializeToClipboard({
        elements: selectedElements,
      });
      writeIntoClipboardData(event.clipboardData, content);
      slideInstance.removeElements(Object.keys(selectedElements));
      event.preventDefault();
    };

    document.addEventListener('cut', handler);
    return () => document.removeEventListener('cut', handler);
  }, [enableShortcuts, isViewingPresentation, slideInstance]);

  const handlePasteImages = useCallback(
    async (files: File[], imageSizes: Size[], centerPosition: Point) => {
      const results = await handleDrop(files);

      const images: ImageToAddData[] = [];
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.status === 'fulfilled') {
          images.push({
            uploadResult: result.value,
            size: imageSizes[i],
          });
        }
      }

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

      if (elements) {
        const elementsArray: Element[] | undefined = Array.isArray(elements)
          ? elements
          : Object.values(elements);

        const { offsetX, offsetY, width, height } =
          calculateBoundingRectForElements(elementsArray);
        const position: Point = {
          x: centerPosition.x - width / 2,
          y: centerPosition.y - height / 2,
        };
        const positionClamp = clampElementPosition(
          position,
          { width, height },
          { width: whiteboardWidth, height: whiteboardHeight },
        );
        let pastedElementIds: string[];
        if (Array.isArray(elements)) {
          const newElements: Element[] = elementsArray.map((element) =>
            modifyElementPosition(element, positionClamp, offsetX, offsetY),
          );
          pastedElementIds = slideInstance.addElements(newElements);
        } else {
          const newElements: Elements = {};
          for (const [elementId, element] of Object.entries(elements)) {
            let newElement = modifyElementPosition(
              element,
              positionClamp,
              offsetX,
              offsetY,
            );

            /**
             * If pasted element is not attached to frame, then
             * try to find an existing frame to attach to.
             */
            if (
              newElement.type !== 'frame' &&
              newElement.attachedFrame === undefined
            ) {
              newElement = copyElementWithAttachedFrame(
                newElement,
                slideInstance.getFrameElements(),
              );
            }
            newElements[elementId] = newElement;
          }
          pastedElementIds =
            slideInstance.addElementsWithRelations(newElements);
        }
        slideInstance.setActiveElementIds(pastedElementIds);
      }

      // Handle image files
      const files = event.clipboardData?.files;
      if (files && files.length > 0) {
        const imageFiles = Array.from(files).filter((file) =>
          defaultAcceptedImageTypesArray.includes(file.type),
        );

        if (imageFiles.length > 0) {
          handlePasteImages(imageFiles, [], centerPosition);
        }

        if (Array.from(files).some((file) => file.type === 'application/pdf')) {
          await initPDFJs();
        }

        const pdfImageFiles: File[] = [];
        const imageSizes: Size[] = [];
        for (const file of files) {
          if (file.type === 'application/pdf') {
            const pdf = await loadPDF(await file.arrayBuffer());
            const images = await renderPDFToImages(pdf);

            let count = 0;
            for (const image of images) {
              count++;
              pdfImageFiles.push(
                new File([image.blob], 'pdfSlide' + count, {
                  type: image.mimeType,
                }),
              );
              imageSizes.push({
                width: image.width,
                height: image.height,
              });
            }
          }
        }

        if (pdfImageFiles.length > 0) {
          handlePasteImages(pdfImageFiles, imageSizes, centerPosition);
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
