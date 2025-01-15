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

import { useCallback } from 'react';
import { FileRejection, useDropzone } from 'react-dropzone';
import {
  ImageElement,
  calculateCentredPosition,
  calculateFittedElementSize,
  useWhiteboardSlideInstance,
} from '../../state';
import { whiteboardHeight, whiteboardWidth } from '../Whiteboard';
import { defaultAcceptedImageTypes } from './consts';
import { ImageUploadResult } from './ImageUploadProvider';
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
};

/**
 * Hook that uploads images to the current slide.
 * Uses react-dropzone {@link https://react-dropzone.js.org/}.
 */
export function useSlideImageUpload(
  { noClick = false, noDrag = false }: UseSlideImageUploadArgs = {
    noClick: false,
    noDrag: false,
  },
) {
  const slide = useWhiteboardSlideInstance();
  const imageUpload = useImageUploadContext();

  const handleDrop = useCallback(
    async (files: File[], rejectedFiles: FileRejection[]) => {
      const results = await imageUpload.handleDrop(files, rejectedFiles);

      const images = results
        .filter((result) => result.status === 'fulfilled')
        .map((result) => {
          return getImageForSlide(result.value);
        });
      slide.addElements(images);
    },
    [imageUpload, slide],
  );

  const { getInputProps, getRootProps } = useDropzone({
    onDrop: handleDrop,
    accept: defaultAcceptedImageTypes,
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

/**
 * Fit and centre an image for a slide.
 *
 * @param uploadResult - Information from the image upload
 * @param uploadResult.mxc - MXC URI of the image {@link https://spec.matrix.org/v1.9/client-server-api/#matrix-content-mxc-uris}
 * @param uploadResult.fileName - File name
 * @param uploadResult.imageSize - Image size
 */
export function getImageForSlide(
  uploadResult: ImageUploadResult,
): ImageElement {
  const fittedSize = calculateFittedElementSize(uploadResult.size, {
    width: whiteboardWidth,
    height: whiteboardHeight,
  });
  const centredPosition = calculateCentredPosition(fittedSize, {
    width: whiteboardWidth,
    height: whiteboardHeight,
  });
  return {
    type: 'image',
    position: centredPosition,
    ...fittedSize,
    mxc: uploadResult.mxc,
    fileName: uploadResult.fileName,
  };
}
