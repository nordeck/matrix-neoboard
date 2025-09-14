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
import ImportDialog from '../ImportDialog';
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

  /**
   * The import dialog, shown if a PDF file is dropped.
   */
  importDialog: React.ReactElement | null;
};

export function useSlideImageDropUpload(): UseSlideImageDropUploadResult {
  const [dragging, setDragging] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  const handleUploadDragEnter = useCallback(() => {
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragging(false);
  }, []);

  const onPdfDrop = useCallback(
    (file: File) => {
      setImportFile(file);
      setImportDialogOpen(true);
      console.log(
        'PDF file dropped, opening import dialog for file:',
        file.name,
      );
    },
    [setImportFile, setImportDialogOpen],
  );

  const uploadDragOverlay = dragging ? (
    <SlideImageUploadOverlay
      onDragLeave={handleDragLeave}
      onPdfDrop={onPdfDrop}
    />
  ) : null;

  const importDialog = importDialogOpen ? (
    <ImportDialog
      open={importDialogOpen}
      onClose={() => setImportDialogOpen(false)}
      initialFile={importFile}
      initialStep="process"
    />
  ) : null;

  return {
    handleUploadDragEnter,
    uploadDragOverlay,
    importDialog,
  };
}
