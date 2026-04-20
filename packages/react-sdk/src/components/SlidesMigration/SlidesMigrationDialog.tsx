/*
 * Copyright 2026 Nordeck IT + Consulting GmbH
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

import Sync from '@mui/icons-material/Sync';
import {
  Alert,
  AlertTitle,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import { unstable_useId as useId } from '@mui/utils';
import { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

type SlideMigrationDialogProps = {
  open: boolean;
  onMigrate: () => void;
  isMigrationDisabled?: boolean;
  isLoading?: boolean;
  isError?: boolean;
  additionalButtons?: ReactElement;
};

export function SlidesMigrationDialog({
  open,
  onMigrate,
  isMigrationDisabled,
  isLoading,
  isError,
  additionalButtons,
}: SlideMigrationDialogProps) {
  const { t } = useTranslation('neoboard');

  const dialogTitleId = useId();
  const dialogDescriptionId = useId();

  return (
    <Dialog
      open={open}
      fullWidth
      maxWidth="sm"
      aria-labelledby={dialogTitleId}
      aria-describedby={dialogDescriptionId}
    >
      <DialogTitle component="h3" id={dialogTitleId}>
        {t('slidesMigrationDialog.title', 'Migrate slides to frames')}
      </DialogTitle>
      <DialogContent>
        {isError && (
          <Alert severity="error" sx={{ mb: 1 }}>
            <AlertTitle>
              {t(
                'slidesMigrationDialog.migrationFailed',
                'Failed to migrate the slides',
              )}
            </AlertTitle>
          </Alert>
        )}
        <DialogContentText id={dialogDescriptionId}>
          {t(
            'slidesMigrationDialog.content',
            'Your existing slides will be migrated to frames. To enable migration, please download a backup of your whiteboard content first.',
          )}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        {additionalButtons}
        <Button
          onClick={onMigrate}
          loading={isLoading}
          disabled={isMigrationDisabled || isError}
          variant="contained"
          startIcon={<Sync />}
        >
          {t('slidesMigrationDialog.migrate', 'Migrate')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
