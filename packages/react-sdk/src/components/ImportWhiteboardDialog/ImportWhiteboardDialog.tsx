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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
} from '@mui/material';
import { unstable_useId as useId, visuallyHidden } from '@mui/utils';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useActiveWhiteboardInstance } from '../../state';
import { importWhiteboard } from '../../state/import';
import { useImageUpload } from '../ImageUpload';
import { ImportedWhiteboard } from './types';

export function ImportWhiteboardDialog({
  open,
  atSlideIndex,
  importedWhiteboard,
  onClose,
  onRetry,
}: {
  open: boolean;
  atSlideIndex?: number;
  importedWhiteboard: ImportedWhiteboard | undefined;
  onClose: () => void;
  onRetry: () => void;
}) {
  const { t } = useTranslation('neoboard');
  const whiteboardInstance = useActiveWhiteboardInstance();
  const { handleDrop } = useImageUpload();

  const handleOnImport = useCallback(() => {
    if (importedWhiteboard?.isError === false) {
      importWhiteboard(
        whiteboardInstance,
        importedWhiteboard.data,
        handleDrop,
        atSlideIndex,
      );
    }
    onClose();
  }, [
    atSlideIndex,
    handleDrop,
    importedWhiteboard,
    onClose,
    whiteboardInstance,
  ]);

  const selectFileButtonLabel = t(
    'boardBar.importWhiteboardDialog.selectFileLabel',
    'Selected file: “{{fileName}}”. Click to select a different file.',
    { fileName: importedWhiteboard?.name ?? '' },
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
          onClick={onRetry}
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
            {importedWhiteboard?.name}
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

        {importedWhiteboard?.isError === false &&
          atSlideIndex === undefined && (
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
        {importedWhiteboard?.isError === true && (
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
      </DialogContent>

      <DialogActions>
        <Button autoFocus onClick={onClose} variant="outlined">
          {t('boardBar.importWhiteboardDialog.success.cancel', 'Cancel')}
        </Button>
        <Button
          onClick={handleOnImport}
          variant="contained"
          disabled={importedWhiteboard?.isError}
        >
          {t('boardBar.importWhiteboardDialog.success.import', 'Import')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
