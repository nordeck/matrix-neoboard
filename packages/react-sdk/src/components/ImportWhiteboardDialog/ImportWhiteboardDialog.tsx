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

import { WidgetApi } from '@matrix-widget-toolkit/api';
import { useWidgetApi } from '@matrix-widget-toolkit/react';
import CloseIcon from '@mui/icons-material/Close';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
} from '@mui/material';
import { unstable_useId as useId, visuallyHidden } from '@mui/utils';
import { getLogger } from 'loglevel';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ImageElement,
  isValidWhiteboardExportDocument,
  useActiveWhiteboardInstance,
  WhiteboardDocumentExport,
} from '../../state';
import { importWhiteboard } from '../../state/import';
import { useImageUpload } from '../ImageUpload';
import { initPDFJs, loadPDF, renderPDFToImages } from './pdfImportUtils';
import { ImportedWhiteboard } from './types';

export function ImportWhiteboardDialog({
  open,
  atSlideIndex,
  importedData,
  onClose,
  onRetry,
}: {
  open: boolean;
  atSlideIndex?: number;
  importedData: ImportedWhiteboard | undefined;
  onClose: () => void;
  onRetry: () => void;
}) {
  const { t } = useTranslation('neoboard');
  const whiteboardInstance = useActiveWhiteboardInstance();
  const { handleDrop } = useImageUpload();
  const [whiteboardData, setWhiteboardData] =
    useState<WhiteboardDocumentExport | null>(null);
  const [error, setError] = useState<boolean>(importedData?.isError ?? false);
  const [loading, setLoading] = useState(true);
  const widgetApi = useWidgetApi();

  // Handle error from upload
  useEffect(() => {
    if (importedData?.isError === true) {
      setError(true);
      setLoading(false);
    }
  }, [importedData, setError, setLoading]);

  const handleOnImport = useCallback(() => {
    if (error === false && whiteboardData) {
      importWhiteboard(
        whiteboardInstance,
        whiteboardData,
        handleDrop,
        atSlideIndex,
      );
    }
    onClose();
  }, [
    handleDrop,
    whiteboardData,
    onClose,
    whiteboardInstance,
    error,
    atSlideIndex,
  ]);

  useEffect(() => {
    if (importedData?.isError === false) {
      if (importedData.data) {
        setWhiteboardData(importedData.data);
        setLoading(false);
        return;
      }
      const file = importedData?.file;
      if (file) {
        if (file.type === 'application/pdf') {
          readPDF(file, widgetApi)
            .then((data) => {
              setWhiteboardData(data);
              setLoading(false);
              return;
            })
            .catch((error) => {
              console.log('Error while reading PDF file', error);
              setError(true);
              setLoading(false);
            });
        } else {
          readNWB(file)
            .then((data) => {
              if (data.isError) {
                console.log('Error while reading nwb file');
                setError(true);
                setLoading(false);
                return;
              }
              setWhiteboardData(data.data ?? null);
              setLoading(false);
              return;
            })
            .catch((error) => {
              console.log('Error while reading nwb file', error);
              setError(true);
              setLoading(false);
            });
        }
      } else {
        console.error('No file provided');
        setError(true);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [importedData, setWhiteboardData, widgetApi, setLoading, setError]);

  const retry = useCallback(() => {
    setLoading(true);
    setError(false);
    onRetry();
  }, [setLoading, onRetry]);

  const selectFileButtonLabel = t(
    'boardBar.importWhiteboardDialog.selectFileLabel',
    'Selected file: “{{fileName}}”. Click to select a different file.',
    { fileName: importedData?.name ?? '' },
  );

  const dialogTitleId = useId();
  const dialogDescriptionId = useId();

  return (
    <Dialog
      aria-labelledby={dialogTitleId}
      aria-describedby={dialogDescriptionId}
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
    >
      <Stack alignItems="baseline" direction="row">
        <DialogTitle component="h3" id={dialogTitleId} sx={{ flex: 1 }}>
          {t('boardBar.importWhiteboardDialog.title', 'Import content')}
        </DialogTitle>
        <Tooltip
          onClick={onClose}
          title={t('boardBar.importWhiteboardDialog.close', 'Close')}
        >
          <IconButton sx={{ mr: 3 }}>
            <CloseIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      <DialogContent id={dialogDescriptionId}>
        <Button
          variant="outlined"
          disableElevation
          disableRipple
          color="inherit"
          fullWidth
          sx={{
            justifyContent: 'space-between',
            color: 'grey.600',
            whiteSpace: 'nowrap',
            fontWeight: 'regular',
          }}
          onClick={retry}
        >
          <Box sx={visuallyHidden}>{selectFileButtonLabel}</Box>
          <Box
            aria-hidden
            component="span"
            flex={1}
            minWidth={0}
            overflow="hidden"
            textOverflow="ellipsis"
            textAlign="left"
          >
            {importedData?.name}
          </Box>
          <Box
            aria-hidden
            component="span"
            color="primary.main"
            fontWeight="medium"
          >
            {t('boardBar.importWhiteboardDialog.selectFile', 'Select file')}
          </Box>
        </Button>

        {error === false && atSlideIndex === undefined && (
          <Alert severity="warning" role="status" sx={{ mt: 1 }}>
            <AlertTitle>
              {t('boardBar.importWhiteboardDialog.successTitle', 'Caution')}
            </AlertTitle>
            {t(
              'boardBar.importWhiteboardDialog.successDescription',
              'Your contents will be replaced. This operation is reversible by using “undo”.',
            )}
          </Alert>
        )}
        {error === true && (
          <Alert severity="error" role="status" sx={{ mt: 1 }}>
            <AlertTitle>
              {t('boardBar.importWhiteboardDialog.errorTitle', 'Error')}
            </AlertTitle>
            {t(
              'boardBar.importWhiteboardDialog.errorDescription',
              "Your file can't be loaded. Please try again by selecting a different file.",
            )}
          </Alert>
        )}

        {loading && <CircularProgress />}
      </DialogContent>

      <DialogActions>
        <Button autoFocus onClick={onClose} variant="outlined">
          {t('boardBar.importWhiteboardDialog.success.cancel', 'Cancel')}
        </Button>
        <Button
          onClick={handleOnImport}
          variant="contained"
          disabled={error || loading}
        >
          {t('boardBar.importWhiteboardDialog.success.import', 'Import')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function readNWB(file: File): Promise<{
  name: string;
  isError: boolean;
  data?: WhiteboardDocumentExport;
}> {
  const reader = new FileReader();

  const logger = getLogger('SettingsMenu');

  return new Promise((resolve) => {
    reader.onabort = () => logger.warn('file reading was aborted');
    reader.onerror = () => logger.warn('file reading has failed');
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        return;
      }

      try {
        const jsonData = JSON.parse(reader.result);

        if (isValidWhiteboardExportDocument(jsonData)) {
          resolve({
            name: file.name,
            isError: false,
            data: jsonData,
          });
        } else {
          resolve({
            name: file.name,
            isError: true,
          });
        }
      } catch (ex) {
        const logger = getLogger('SettingsMenu');
        logger.error('Error while parsing the selected import file', ex);

        resolve({
          name: file.name,
          isError: true,
        });
      }
    };

    reader.readAsText(file);
  });
}

async function readPDF(
  file: File,
  widgetApi: WidgetApi,
): Promise<WhiteboardDocumentExport> {
  await initPDFJs();

  const logger = getLogger('SettingsMenu');
  logger.debug('Reading PDF file', file.name);

  const pdf = await loadPDF(await file.arrayBuffer());
  logger.debug('PDF loaded', pdf.numPages);

  logger.debug('Rendering PDF to images');
  const images = await renderPDFToImages(pdf);

  logger.debug('PDF rendered to images', images.length);
  logger.debug('Uploading images to the server');

  const imageData = [];
  for (const image of images) {
    const resp = await widgetApi.uploadFile(image.data);

    const base64 = btoa(
      new Uint8Array(image.data).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        '',
      ),
    );

    imageData.push({
      mxc: resp.content_uri,
      width: image.width,
      height: image.height,
      size: image.size,
      mimeType: image.mimeType,
      base64: base64,
    });
  }

  const whiteboardData: WhiteboardDocumentExport = {
    version: 'net.nordeck.whiteboard@v1',
    whiteboard: {
      // Each image is a slide
      slides: imageData.map((data, i) => ({
        elements: [
          {
            type: 'image',
            mxc: data.mxc,
            width: data.width,
            height: data.height,
            fileName: `${file.name}_${i}`,
            mimeType: data.mimeType,
            position: {
              x: (1920 - data.width) / 2,
              y: (1080 - data.height) / 2,
            },
          } as ImageElement,
        ],
      })),
      files: imageData.map((data) => ({
        mxc: data.mxc,
        data: data.base64,
      })),
    },
  };
  return whiteboardData;
}
