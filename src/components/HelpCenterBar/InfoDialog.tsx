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
import CloseIcon from '@mui/icons-material/Close';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Link,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { unstable_useId as useId } from '@mui/utils';
import { DispatchWithoutAction, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CopyableText } from '../common/CopyableText';

type InfoDialogProps = {
  open: boolean;
  onClose: DispatchWithoutAction;
};

export function InfoDialog({ open, onClose }: InfoDialogProps) {
  const { t } = useTranslation();
  const [showRevision, setShowRevision] = useState(false);

  const version = getEnvironment('REACT_APP_VERSION', 'unset');
  const revision = getEnvironment('REACT_APP_REVISION', 'unset');

  const onClickShowRevision = useCallback(() => {
    setShowRevision((old) => !old);
  }, []);

  const dialogTitleId = useId();
  const dialogDescriptionId = useId();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby={dialogTitleId}
      aria-describedby={dialogDescriptionId}
    >
      <Stack alignItems="baseline" direction="row">
        <DialogTitle component="h3" id={dialogTitleId} sx={{ flex: 1 }}>
          {t('helpCenter.info.title', 'About NeoBoard')}
        </DialogTitle>
        <Tooltip title={t('helpCenter.info.close', 'Close')}>
          <IconButton
            sx={{ mr: 3 }}
            aria-label={t('helpCenter.info.close', 'Close')}
            onClick={onClose}
          >
            <CloseIcon />
          </IconButton>
        </Tooltip>
      </Stack>
      <DialogContent sx={{ pt: 0 }}>
        <DialogContentText
          id={dialogDescriptionId}
          sx={{ wordBreak: 'break-all' }}
        >
          {t('helpCenter.info.version', 'Version {{version}}', {
            version,
            revision,
          })}
        </DialogContentText>
        <Typography my={1} fontWeight="bold">
          <Link
            component="button"
            onClick={onClickShowRevision}
            underline="none"
          >
            {!showRevision
              ? t('helpCenter.info.showMore', 'Show more')
              : t('helpCenter.info.showLess', 'Show less')}
          </Link>
        </Typography>
        {showRevision && (
          <CopyableText
            label={t('helpCenter.info.commitHash', 'Commit hash')}
            text={revision}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} autoFocus variant="contained">
          {t('helpCenter.info.close', 'Close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
