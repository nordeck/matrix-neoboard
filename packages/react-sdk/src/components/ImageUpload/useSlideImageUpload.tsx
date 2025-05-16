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
import {
  initPDFJs,
  loadPDF,
  renderPDFToImages,
} from '../ImportDialog/pdfImportUtils';
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
      const newFiles: File[] = [];
      const imageSizes: Size[] = [];

      if (Array.from(files).some((file) => file.type === 'application/pdf')) {
        await initPDFJs();
      }

      for (const file of files) {
        if (file.type !== 'application/pdf') {
          newFiles.push(file);
        } else {
          const pdf = await loadPDF(await file.arrayBuffer());
          const images = await renderPDFToImages(pdf);

          let count = 0;
          for (const image of images) {
            count++;
            newFiles.push(
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
    [imageUpload, slide, calculateSvgCoords, viewportCanvasCenter],
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
