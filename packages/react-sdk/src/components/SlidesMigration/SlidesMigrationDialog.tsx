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
import { Fragment, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

type SlidesMigrationDialogProps = {
  open: boolean;
  canUpdate: boolean;
  onUpdate: () => void;
  isUpdateDisabled?: boolean;
  isLoading?: boolean;
  isError?: boolean;
  exportButton?: ReactElement;
  additionalButtons?: ReactElement;
};

export function SlidesMigrationDialog({
  open,
  canUpdate,
  onUpdate,
  isUpdateDisabled,
  isLoading,
  isError,
  exportButton = <Fragment />,
  additionalButtons,
}: SlidesMigrationDialogProps) {
  const { t } = useTranslation('neoboard');

  const dialogTitleId = useId();
  const dialogDescriptionId = useId();

  const additionalButtonsElement = additionalButtons ?? <Fragment />;

  return (
    <Dialog
      open={open}
      fullWidth
      maxWidth="sm"
      aria-labelledby={dialogTitleId}
      aria-describedby={dialogDescriptionId}
    >
      <DialogTitle component="h3" id={dialogTitleId}>
        {canUpdate
          ? t('slidesMigrationDialog.title', 'Slides are now Frames')
          : t(
              'slidesMigrationDialog.titleUpgradeRequired',
              'Upgrade is Required',
            )}
      </DialogTitle>
      <DialogContent>
        {isError && (
          <Alert severity="error" sx={{ mb: 1 }}>
            <AlertTitle>
              {t(
                'slidesMigrationDialog.migrationFailed',
                'An issue occurred when moving Slides into Frames',
              )}
            </AlertTitle>
          </Alert>
        )}
        <DialogContentText id={dialogDescriptionId}>
          {canUpdate
            ? t(
                'slidesMigrationDialog.content',
                'Your existing Slides will now be shown as Frames - a new way to organize your content. Please download a copy of your whiteboard before continuing.',
              )
            : t(
                'slidesMigrationDialog.contentUpgradeRequired',
                'A newer version is required to work with the stored document.',
              )}
        </DialogContentText>
      </DialogContent>
      {(additionalButtons || canUpdate) && (
        <DialogActions>
          {additionalButtonsElement}
          {canUpdate && exportButton}
          {canUpdate && (
            <Button
              onClick={onUpdate}
              loading={isLoading}
              disabled={isUpdateDisabled || isError}
              variant="contained"
              startIcon={<Sync />}
            >
              {t('slidesMigrationDialog.update', 'Continue')}
            </Button>
          )}
        </DialogActions>
      )}
    </Dialog>
  );
}
