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

import CloseIcon from '@mui/icons-material/Close';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  CircularProgress,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
} from '@mui/material';
import { unstable_useId as useId, visuallyHidden } from '@mui/utils';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useActiveWhiteboardInstance,
  WhiteboardDocumentExport,
} from '../../state';
import { importWhiteboard } from '../../state/import';
import { Dialog } from '../common/Dialog';
import { useImageUpload } from '../ImageUpload';
import { readNWB, readPDF } from './fileHandlers';
import { ImportedWhiteboard } from './types';

/**
 * ImportWhiteboardDialog component is responsible for handling the import of whiteboard data.
 * It provides a dialog interface for users to select and import whiteboard files.
 *
 * @param {Object} props - The properties object.
 * @param {boolean} props.open - Determines if the dialog is open.
 * @param {number} [props.atSlideIndex] - Optional index of the slide where the whiteboard data should be imported.
 * @param {ImportedWhiteboard | undefined} props.importedData - The data of the imported whiteboard.
 * @param {() => void} props.onClose - Callback function to handle the closing of the dialog.
 * @param {() => void} props.onRetry - Callback function to handle retrying the import process.
 *
 * @returns {JSX.Element} The ImportWhiteboardDialog component.
 */
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

  // Handle error from upload
  useEffect(() => {
    if (importedData?.isError === true) {
      setError(true);
      setLoading(false);
    }
  }, [importedData, setError, setLoading]);

  const handleClose = useCallback(() => {
    setWhiteboardData(null);
    setLoading(false);
    setError(false);
    onClose();
  }, [setWhiteboardData, setLoading, setError, onClose]);

  const handleOnImport = useCallback(() => {
    if (error === false && whiteboardData && importedData?.isError === false) {
      setLoading(true);
      importWhiteboard(
        whiteboardInstance,
        whiteboardData,
        handleDrop,
        atSlideIndex,
        importedData?.file?.type === 'application/pdf'
          ? importedData.name
          : undefined,
      )
        .then((errors) => {
          if (errors.size > 0) {
            console.error('Error while importing whiteboard', errors);
            setError(true);
            setLoading(false);
            return;
          }

          setWhiteboardData(null);
          onClose();
          setLoading(false);
          return;
        })
        .catch((error) => {
          console.error('Error while importing whiteboard', error);
          setError(true);
          setLoading(false);
        });
    } else {
      onClose();
    }
  }, [
    handleDrop,
    whiteboardData,
    onClose,
    whiteboardInstance,
    error,
    atSlideIndex,
    importedData,
  ]);

  useEffect(() => {
    // We cant do a decission without importedData so we just wait.
    if (!importedData) {
      return;
    }

    // We got importated data and its not an error so we move on.
    if (importedData && importedData?.isError === false) {
      if (importedData.data) {
        setWhiteboardData(importedData.data);
        setLoading(false);
        return;
      }
      const file = importedData?.file;
      if (file) {
        if (file.type === 'application/pdf') {
          setLoading(true);
          readPDF(file)
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
          setLoading(true);
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

      // We got an error so we set the error state and stop loading.
    } else {
      setError(true);
      setLoading(false);
    }
  }, [importedData, setWhiteboardData, setLoading, setError]);

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
      onClose={handleClose}
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

        {loading && (
          <CircularProgress
            sx={{
              display: 'block',
              margin: 'auto',
              mt: 1,
            }}
          />
        )}
      </DialogContent>

      <DialogActions>
        <Button autoFocus onClick={handleClose} variant="outlined">
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
