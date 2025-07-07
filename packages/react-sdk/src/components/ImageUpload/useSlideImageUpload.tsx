/*
 * Copyright 2024 Nordeck IT + Consulting GmbH
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

import { DragEvent, useCallback } from 'react';
import { DropEvent, FileRejection, useDropzone } from 'react-dropzone';
import { Point, Size, useWhiteboardSlideInstance } from '../../state';
import { useSvgScaleContext } from '../Whiteboard';
import { addImagesToSlide, ImageToAddData } from './addImagesToSlide';
import { defaultAcceptedImageTypes } from './consts';
import { useImageUpload as useImageUploadContext } from './useImageUpload';

type UseSlideImageUploadArgs = {
  /**
   * If true, do not handle click.
   */
  noClick?: boolean;
  /**
   * If true, do not handle drag.
   */
  noDrag?: boolean;
  /**
   * If defined, is used to calculate element coordinates from mouse clientX, clientY drag event
   * @param position mouse clientX, clientY
   */
  calculateSvgCoords?: (position: Point) => Point;
  /** Called when a PDF is dropped. If set, PDF files will not be handled as images. */
  onPdfDrop?: (file: File) => void;
};

/**
 * Hook that uploads images to the current slide.
 * Uses react-dropzone {@link https://react-dropzone.js.org/}.
 */
export function useSlideImageUpload(
  {
    noClick = false,
    noDrag = false,
    calculateSvgCoords,
    onPdfDrop,
  }: UseSlideImageUploadArgs = {
    noClick: false,
    noDrag: false,
  },
) {
  const slide = useWhiteboardSlideInstance();
  const imageUpload = useImageUploadContext();
  const { viewportCanvasCenter } = useSvgScaleContext();

  const handleDrop = useCallback(
    async (files: File[], rejectedFiles: FileRejection[], event: DropEvent) => {
      // Check for PDF
      const pdfFile = files.find((file) => file.type === 'application/pdf');
      if (pdfFile && onPdfDrop) {
        onPdfDrop(pdfFile);
        return;
      }
      const newFiles: File[] = files;
      const imageSizes: Size[] = [];

      const results = await imageUpload.handleDrop(newFiles, rejectedFiles);

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

      let position: Point;
      if (
        !Array.isArray(event) &&
        event.type === 'drop' &&
        calculateSvgCoords
      ) {
        const dragEvent = event as DragEvent;
        position = calculateSvgCoords({
          x: dragEvent.clientX,
          y: dragEvent.clientY,
        });
      } else {
        position = viewportCanvasCenter;
      }
      addImagesToSlide(slide, images, position);
    },
    [imageUpload, slide, calculateSvgCoords, viewportCanvasCenter, onPdfDrop],
  );

  const { getInputProps, getRootProps } = useDropzone({
    onDrop: handleDrop,
    accept: {
      ...defaultAcceptedImageTypes,
      'application/pdf': ['.pdf'],
    },
    maxSize: imageUpload.maxUploadSizeBytes,
    noClick,
    noDrag,
    multiple: true,
    noKeyboard: true,
  });

  return {
    getInputProps,
    getRootProps,
  };
}
