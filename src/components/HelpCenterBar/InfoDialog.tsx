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

import { getEnvironment } from '@matrix-widget-toolkit/mui';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import { unstable_useId as useId } from '@mui/utils';
import { DispatchWithoutAction } from 'react';
import { useTranslation } from 'react-i18next';

type InfoDialogProps = {
  open: boolean;
  onClose: DispatchWithoutAction;
};

export function InfoDialog({ open, onClose }: InfoDialogProps) {
  const { t } = useTranslation();

  const version = getEnvironment('REACT_APP_VERSION', 'unset');
  const revision = getEnvironment('REACT_APP_REVISION', 'unset');

  const dialogTitleId = useId();
  const dialogDescriptionId = useId();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby={dialogTitleId}
      aria-describedby={dialogDescriptionId}
    >
      <DialogTitle id={dialogTitleId}>
        {t('helpCenter.info.title', 'About NeoBoard')}
      </DialogTitle>
      <DialogContent>
        <DialogContentText
          id={dialogDescriptionId}
          sx={{ wordBreak: 'break-all' }}
        >
          {t('helpCenter.info.version', 'Version {{version}} ({{revision}})', {
            version,
            revision,
          })}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} autoFocus>
          {t('helpCenter.info.close', 'Close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
