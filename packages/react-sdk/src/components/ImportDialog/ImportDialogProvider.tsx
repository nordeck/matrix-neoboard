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
import { ImportWhiteboardDialog } from '../BoardBar/ImportWhiteboardDialog';
import { ImportedWhiteboard } from '../BoardBar/types';

export type ImportDialogProps = {};

export type ImportDialogState = {
  showImportDialog: (atSlideIndex?: number) => void;
};

export const ImportDialogContext = createContext<ImportDialogState | undefined>(
  undefined,
);

export function ImportDialogProvider({ children }: PropsWithChildren<{}>) {
  const [atSlideIndex, setAtSlideIndex] = useState<number | undefined>(
    undefined,
  );
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [importedWhiteboard, setImportedWhiteboard] =
    useState<ImportedWhiteboard>();

  const onDrop = useCallback(
    ([file]: File[], rejectedFiles: FileRejection[]) => {
      if (file === undefined && rejectedFiles.length > 0) {
        setImportedWhiteboard({
          name: rejectedFiles[0].file.name,
          isError: true,
        });
        setOpenImportDialog(true);
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

          setOpenImportDialog(true);
        } catch (ex) {
          const logger = getLogger('SettingsMenu');
          logger.error('Error while parsing the selected import file', ex);

          setImportedWhiteboard({
            name: file.name,
            isError: true,
          });
          setOpenImportDialog(true);
        }
      };

      reader.readAsText(file);
    },
    [],
  );

  const showImportDialog = (atSlideIndex?: number) => {
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
    <ImportDialogContext.Provider
      value={{
        showImportDialog,
      }}
    >
      <div {...getRootProps()}>
        <input {...getInputProps()} data-testid="import-file-picker" />
        <ImportWhiteboardDialog
          open={openImportDialog}
          atSlideIndex={atSlideIndex}
          importedWhiteboard={importedWhiteboard}
          onClose={useCallback(() => {
            setOpenImportDialog(false);
            alert('close');
            // setAtSlideIndex(undefined);
          }, [])}
          onRetry={openFilePicker}
        />
      </div>
      {children}
    </ImportDialogContext.Provider>
  );
}
