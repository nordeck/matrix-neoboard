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

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useConnectionState } from './useConnectionState';

export const ConnectionStateDialog: React.FC = () => {
  const { t } = useTranslation('neoboard');
  const {
    connectionState,
    connectionStateDialogOpen,
    handleCloseConnectionStateDialog,
  } = useConnectionState();

  const text = useMemo(() => {
    if (connectionState === 'no_internet_connection') {
      return t(
        'connectionState.dialog.text.no_internet_connection',
        'NeoBoard cannot save your data at the moment. Check your internet connection. This message will disappear as soon as the data has been saved again. To be on the safe side, you can download a copy of the board using the export function.',
      );
    }

    return t(
      'connectionState.dialog.text.common',
      'NeoBoard cannot save your data at the moment due to a connection problem. This message will disappear as soon as it has been saved again. To be on the safe side, you can download a copy of the board using the export function.',
    );
  }, [connectionState, t]);

  if (!connectionStateDialogOpen) {
    return null;
  }

  return (
    <Dialog onClose={handleCloseConnectionStateDialog} open={true}>
      <DialogTitle>
        {t('connectionState.dialog.title', 'Your changes are not saved')}
      </DialogTitle>
      <DialogContent>
        <DialogContentText>{text}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseConnectionStateDialog} variant="outlined">
          {t('connectionState.dialog.confirm', 'OK')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
