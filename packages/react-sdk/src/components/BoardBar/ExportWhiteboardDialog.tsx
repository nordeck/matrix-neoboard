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
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  Tooltip,
} from '@mui/material';
import { unstable_useId as useId, visuallyHidden } from '@mui/utils';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExportWhiteboardDialogDownloadFile } from './ExportWhiteboardDialogDownloadFile';
import { ExportWhiteboardDialogDownloadPdf } from './ExportWhiteboardDialogDownloadPdf';

export type WhiteboardDocumentExportFileFormat = 'nwb' | 'pdf';

export function ExportWhiteboardDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const dialogTitleId = useId();
  const dialogDescriptionId = useId();

  return (
    <Dialog
      aria-labelledby={dialogTitleId}
      aria-describedby={dialogDescriptionId}
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <ExportWhiteboardDialogContent
        descriptionId={dialogDescriptionId}
        titleId={dialogTitleId}
        onClose={onClose}
      />
    </Dialog>
  );
}

function ExportWhiteboardDialogContent({
  titleId,
  descriptionId,
  onClose,
}: {
  titleId?: string;
  descriptionId?: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  const [error, setError] = useState<string>();

  const [fileFormat, setFileFormat] =
    useState<WhiteboardDocumentExportFileFormat>('pdf');

  const handleFileFormatChange = (event: SelectChangeEvent) => {
    setFileFormat(event.target.value as WhiteboardDocumentExportFileFormat);
    setError(undefined);
  };

  const downloadTitle = t(
    'boardBar.exportWhiteboardDialog.download',
    'Download',
  );

  const selectLabelId = useId();

  return (
    <>
      <Stack alignItems="baseline" direction="row">
        <DialogTitle component="h3" id={titleId} sx={{ flex: 1 }}>
          {t('boardBar.exportWhiteboardDialog.title', 'Export the content')}
        </DialogTitle>
        <Tooltip
          onClick={onClose}
          title={t('boardBar.exportWhiteboardDialog.close', 'Close')}
        >
          <IconButton sx={{ mr: 3 }}>
            <CloseIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      <DialogContent sx={{ pt: 0 }}>
        <DialogContentText id={descriptionId} paragraph>
          {t(
            'boardBar.exportWhiteboardDialog.description',
            'Please choose your preferred format.',
          )}
        </DialogContentText>

        <FormControl fullWidth>
          <InputLabel id={selectLabelId} sx={visuallyHidden}>
            {t(
              'boardBar.exportWhiteboardDialog.fileFormat.title',
              'File format',
            )}
          </InputLabel>
          <Select
            labelId={selectLabelId}
            onChange={handleFileFormatChange}
            value={fileFormat}
          >
            <MenuItem value="pdf">
              {t(
                'boardBar.exportWhiteboardDialog.fileFormat.pdf',
                'PDF-File (.pdf)',
              )}
            </MenuItem>
            <MenuItem value="nwb">
              {t(
                'boardBar.exportWhiteboardDialog.fileFormat.nwb',
                'NeoBoard-File (.nwb)',
              )}
            </MenuItem>
          </Select>
        </FormControl>

        {error && (
          <Alert role="status" severity="error" sx={{ mt: 2 }}>
            {t(
              'boardBar.exportWhiteboardDialog.pdfError',
              'Something went wrong while generating the PDF.',
            )}
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button
          autoFocus
          onClick={onClose}
          variant="outlined"
          sx={{ marginRight: 1 }}
        >
          {t('boardBar.exportWhiteboardDialog.cancel', 'Cancel')}
        </Button>

        {fileFormat === 'nwb' ? (
          <ExportWhiteboardDialogDownloadFile onClick={onClose}>
            {downloadTitle}
          </ExportWhiteboardDialogDownloadFile>
        ) : (
          <ExportWhiteboardDialogDownloadPdf
            error={error}
            onClick={onClose}
            onError={setError}
          >
            {downloadTitle}
          </ExportWhiteboardDialogDownloadPdf>
        )}
      </DialogActions>
    </>
  );
}
