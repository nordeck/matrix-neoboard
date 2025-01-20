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
  Dialog,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSnapshotLoadState } from './useSnapshotLoadState';

export const SnapshotLoadStateDialog: React.FC = () => {
  const { t } = useTranslation('neoboard');
  const { snapshotLoadDialogOpen } = useSnapshotLoadState();

  if (!snapshotLoadDialogOpen) {
    return null;
  }

  return (
    <Dialog open={true} disableEscapeKeyDown={true}>
      <DialogTitle>
        {t('snapshotLoadState.dialog.title', 'Unable to display the board')}
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          {t(
            'snapshotLoadState.dialog.text',
            'You will be able to see the contents when another user is working on the board.',
          )}
        </DialogContentText>
      </DialogContent>
    </Dialog>
  );
};
