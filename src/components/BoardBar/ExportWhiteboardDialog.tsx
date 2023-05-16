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
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { LoadingButton } from '@mui/lab';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
} from '@mui/material';
import { unstable_useId as useId } from '@mui/utils';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useActiveWhiteboardInstance } from '../../state';
import { useGetRoomNameQuery } from '../../store';

export function ExportWhiteboardDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  const dialogTitleId = useId();
  const dialogDescriptionId = useId();

  return (
    <Dialog
      aria-labelledby={dialogTitleId}
      aria-describedby={dialogDescriptionId}
      open={open}
      onClose={onClose}
    >
      <Stack alignItems="baseline" direction="row">
        <DialogTitle component="h3" id={dialogTitleId} sx={{ flex: 1 }}>
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
        <DialogContentText id={dialogDescriptionId}>
          {t(
            'boardBar.exportWhiteboardDialog.description',
            'Download a copy of your content. You can import the file into a different room with the import feature.'
          )}
        </DialogContentText>
      </DialogContent>

      <DialogActions>
        <Button autoFocus onClick={onClose} variant="outlined">
          {t('boardBar.exportWhiteboardDialog.cancel', 'Cancel')}
        </Button>

        <ExportWhiteboardButton onClick={onClose} />
      </DialogActions>
    </Dialog>
  );
}

function ExportWhiteboardButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();

  const whiteboardInstance = useActiveWhiteboardInstance();
  const [downloadUrl, setDownloadUrl] = useState<string>();

  const { data: roomNameStateEvent } = useGetRoomNameQuery();
  const roomName = roomNameStateEvent?.event?.content.name ?? 'NeoBoard';

  useEffect(() => {
    const whiteboardContent = whiteboardInstance.export();

    const blob = new Blob([JSON.stringify(whiteboardContent)]);

    const url = URL.createObjectURL(blob);
    setDownloadUrl(url);

    return () => {
      setDownloadUrl(undefined);
      URL.revokeObjectURL(url);
    };
  }, [whiteboardInstance]);

  return (
    <LoadingButton
      component="a"
      download={`${roomName}.nwb`}
      loading={!downloadUrl}
      href={downloadUrl}
      onClick={onClick}
      startIcon={<FileDownloadIcon />}
      target="_blank"
      variant="contained"
      sx={{ marginLeft: 1 }}
    >
      {t('boardBar.exportWhiteboardDialog.download', 'Download')}
    </LoadingButton>
  );
}
