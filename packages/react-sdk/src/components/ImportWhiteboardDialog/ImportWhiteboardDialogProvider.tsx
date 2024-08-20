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

import { getLogger } from 'loglevel';
import { PropsWithChildren, createContext, useCallback, useState } from 'react';
import { FileRejection, useDropzone } from 'react-dropzone';
import { isValidWhiteboardExportDocument } from '../../state';
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
  const [importedWhiteboard, setImportedWhiteboard] =
    useState<ImportedWhiteboard>();

  const onDrop = useCallback(
    ([file]: File[], rejectedFiles: FileRejection[]) => {
      if (file === undefined && rejectedFiles.length > 0) {
        setImportedWhiteboard({
          name: rejectedFiles[0].file.name,
          isError: true,
        });
        setOpenImportWhiteboardDialog(true);
        return;
      }

      const reader = new FileReader();

      const logger = getLogger('SettingsMenu');

      reader.onabort = () => logger.warn('file reading was aborted');
      reader.onerror = () => logger.warn('file reading has failed');
      reader.onload = () => {
        if (typeof reader.result !== 'string') {
          return;
        }

        try {
          const jsonData = JSON.parse(reader.result);

          if (isValidWhiteboardExportDocument(jsonData)) {
            setImportedWhiteboard({
              name: file.name,
              isError: false,
              data: jsonData,
            });
          } else {
            setImportedWhiteboard({
              name: file.name,
              isError: true,
            });
          }

          setOpenImportWhiteboardDialog(true);
        } catch (ex) {
          const logger = getLogger('SettingsMenu');
          logger.error('Error while parsing the selected import file', ex);

          setImportedWhiteboard({
            name: file.name,
            isError: true,
          });
          setOpenImportWhiteboardDialog(true);
        }
      };

      reader.readAsText(file);
    },
    [],
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
    accept: { 'application/octet-stream': ['.nwb'] },
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
      <input {...getInputProps()} data-testid="import-file-picker" />
      <ImportWhiteboardDialog
        open={openImportWhiteboardDialog}
        atSlideIndex={atSlideIndex}
        importedWhiteboard={importedWhiteboard}
        onClose={useCallback(() => {
          setAtSlideIndex(undefined);
          setOpenImportWhiteboardDialog(false);
        }, [])}
        onRetry={openFilePicker}
      />
      {children}
    </ImportWhiteboardDialogContext.Provider>
  );
}
