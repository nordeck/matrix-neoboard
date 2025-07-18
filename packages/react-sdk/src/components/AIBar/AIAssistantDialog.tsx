/*
 * Copyright 2025 Nordeck IT + Consulting GmbH
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
  IconButton,
  Stack,
  TextareaAutosize,
  Tooltip,
} from '@mui/material';
import { unstable_useId as useId } from '@mui/utils';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export type AIAssistantService = 'ollama' | 'open-ai';

export function AIAssistantDialog({
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
      <AISettingsDialogContent
        descriptionId={dialogDescriptionId}
        titleId={dialogTitleId}
        onClose={onClose}
      />
    </Dialog>
  );
}

function AISettingsDialogContent({
  titleId,
  descriptionId,
  onClose,
}: {
  titleId?: string;
  descriptionId?: string;
  onClose: () => void;
}) {
  const { t } = useTranslation('neoboard');

  const [error, setError] = useState<string>();

  const [apiKey, setAPIKey] = useState('');

  const handleAPIKeyChange: React.ChangeEventHandler<HTMLTextAreaElement> = (
    event,
  ) => {
    setAPIKey(event.target.value);
    setError(undefined);
  };

  return (
    <>
      <Stack alignItems="baseline" direction="row">
        <DialogTitle component="h3" id={titleId} sx={{ flex: 1 }}>
          {t('boardBar.aiAssistant.title', 'AI Assistant Settings')}
        </DialogTitle>
        <Tooltip
          onClick={onClose}
          title={t('boardBar.aiAssistant.close', 'Close')}
        >
          <IconButton sx={{ mr: 3 }}>
            <CloseIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      <DialogContent sx={{ pt: 0 }}>
        <DialogContentText id={descriptionId} component="p">
          {t(
            'boardBar.aiAssistant.description',
            'Please state what you want the AI Assistant to change on your board.',
          )}
        </DialogContentText>

        <TextareaAutosize
          autoFocus
          minRows={5}
          onChange={handleAPIKeyChange}
          style={{ resize: 'vertical', width: '100%' }}
          value={apiKey}
        ></TextareaAutosize>

        {error && (
          <Alert role="status" severity="error" sx={{ mt: 2 }}>
            {t(
              'boardBar.aiAssistant.pdfError',
              'Something went wrong while generating the PDF.',
            )}
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button
          color="primary"
          onClick={onClose}
          sx={{ marginRight: 1 }}
          variant="contained"
        >
          {t('boardBar.aiAssistant.cancel', 'Start')}
        </Button>
      </DialogActions>
    </>
  );
}
