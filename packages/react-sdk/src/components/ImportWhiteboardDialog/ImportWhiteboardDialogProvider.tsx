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

import { PropsWithChildren, createContext, useCallback, useState } from 'react';
import { FileRejection, useDropzone } from 'react-dropzone';
import { ImportWhiteboardDialog } from './ImportWhiteboardDialog';
import { ImportedWhiteboard } from './types';

export type ImportWhiteboardDialogProps = {};

export type ImportWhiteboardDialogState = {
  showImportWhiteboardDialog: (atSlideIndex?: number) => void;
};

export const ImportWhiteboardDialogContext = createContext<
  ImportWhiteboardDialogState | undefined
>(undefined);

export function ImportWhiteboardDialogProvider({
  children,
}: PropsWithChildren<{}>) {
  const [atSlideIndex, setAtSlideIndex] = useState<number | undefined>(
    undefined,
  );
  const [openImportWhiteboardDialog, setOpenImportWhiteboardDialog] =
    useState(false);
  const [importedData, setImportedData] = useState<ImportedWhiteboard>();

  const onDrop = useCallback(
    ([file]: File[], rejectedFiles: FileRejection[]) => {
      if (file === undefined && rejectedFiles.length > 0) {
        setImportedData({
          name: rejectedFiles[0].file.name,
          isError: true,
        });
        setOpenImportWhiteboardDialog(true);
        return;
      }

      setImportedData({
        name: file.name,
        isError: false,
        file: file,
      });
      setOpenImportWhiteboardDialog(true);
    },
    [setOpenImportWhiteboardDialog, setImportedData],
  );

  const showImportWhiteboardDialog = (atSlideIndex?: number) => {
    setAtSlideIndex(atSlideIndex);
    inputRef.current?.click();
  };

  const {
    getInputProps,
    getRootProps,
    inputRef,
    open: openFilePicker,
  } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: {
      'application/octet-stream': ['.nwb'],
      'application/pdf': ['.pdf'],
    },
    noDrag: true,
    multiple: false,
    // the keyboard interactions are already provided by the MenuItems
    noKeyboard: true,
  });

  return (
    <ImportWhiteboardDialogContext.Provider
      value={{
        showImportWhiteboardDialog,
      }}
    >
      <div {...getRootProps()}></div>
      {/* We are hiding it for screen readers and instead expect the dialog to be used */}
      <input
        {...getInputProps()}
        data-testid="import-file-picker"
        aria-hidden
      />
      <ImportWhiteboardDialog
        open={openImportWhiteboardDialog}
        atSlideIndex={atSlideIndex}
        importedData={importedData}
        onClose={useCallback(() => {
          setImportedData(undefined);
          setAtSlideIndex(undefined);
          setOpenImportWhiteboardDialog(false);
        }, [])}
        onRetry={openFilePicker}
      />
      {children}
    </ImportWhiteboardDialogContext.Provider>
  );
}
