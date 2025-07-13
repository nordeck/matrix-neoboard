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
  Dialog,
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
  TextField,
  Tooltip,
} from '@mui/material';
import { unstable_useId as useId } from '@mui/utils';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export type AIAssistantService = 'ollama' | 'openai';

export function AISettingsDialog({
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

  const [service, setService] = useState<AIAssistantService>('ollama');
  const [apiKey, setAPIKey] = useState('');

  const handleServiceChange = (event: SelectChangeEvent) => {
    setService(event.target.value as AIAssistantService);
    setError(undefined);
  };

  const handleAPIKeyChange: React.ChangeEventHandler<HTMLInputElement> = (
    event,
  ) => {
    setAPIKey(event.target.value);
    setError(undefined);
  };

  const selectLabelId = useId();

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
            'Please choose your a service. For OpenAI, enter an API Key.',
          )}
        </DialogContentText>

        <FormControl fullWidth>
          <InputLabel id={selectLabelId}>
            {t('boardBar.aiAssistant.service.title', 'Service')}
          </InputLabel>
          <Select
            labelId={selectLabelId}
            onChange={handleServiceChange}
            value={service}
          >
            <MenuItem value="ollama">
              {t('boardBar.aiAssistant.service.ollama', 'Ollama')}
            </MenuItem>
            <MenuItem value="openai">
              {t('boardBar.aiAssistant.service.openai', 'OpenAI')}
            </MenuItem>
          </Select>
        </FormControl>

        <TextField
          fullWidth
          label={t('boardBar.aiAssistant.apiKey.title', 'OpenAI API Key')}
          onChange={handleAPIKeyChange}
          value={apiKey}
        ></TextField>

        {error && (
          <Alert role="status" severity="error" sx={{ mt: 2 }}>
            {t(
              'boardBar.aiAssistant.pdfError',
              'Something went wrong while generating the PDF.',
            )}
          </Alert>
        )}
      </DialogContent>

      {/* <DialogActions>
        <Button
          autoFocus
          onClick={onClose}
          variant="outlined"
          sx={{ marginRight: 1 }}
        >
          {t('boardBar.aiAssistant.cancel', 'Cancel')}
        </Button>
      </DialogActions> */}
    </>
  );
}
