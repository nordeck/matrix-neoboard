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
import { useWhiteboardSlideInstance } from '../../state';
import { addImagesToSlide } from './addImagesToSlide';
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
        .map((result) => result.value);
      addImagesToSlide(slide, images);
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
