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

import React, { useCallback, useState } from 'react';
import { SlideImageUploadOverlay } from './SlideImageUploadOverlay';

type UseSlideImageDropUploadResult = {
  /**
   * Must be attached to a component catching the initial drag of a file.
   */
  handleUploadDragEnter: () => void;
  /**
   * The upload file overlay, shown if a file is dragged.
   */
  uploadDragOverlay: React.ReactElement | null;
};

export function useSlideImageDropUpload(): UseSlideImageDropUploadResult {
  const [dragging, setDragging] = useState(false);

  const handleUploadDragEnter = useCallback(() => {
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragging(false);
  }, []);

  const uploadDragOverlay = dragging ? (
    <SlideImageUploadOverlay onDragLeave={handleDragLeave} />
  ) : null;

  return {
    handleUploadDragEnter,
    uploadDragOverlay,
  };
}
