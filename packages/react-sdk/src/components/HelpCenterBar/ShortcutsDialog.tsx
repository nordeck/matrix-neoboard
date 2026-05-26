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

import CloseIcon from '@mui/icons-material/Close';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { unstable_useId as useId } from '@mui/utils';
import { DispatchWithoutAction } from 'react';
import { useTranslation } from 'react-i18next';
import { HotkeysHelp } from '../common/HotkeysHelp';
import { isMacOS } from '../common/platform';
import { SHORTCUTS } from './utils';

type ShortcutsDialogProps = {
  open: boolean;
  onClose: DispatchWithoutAction;
};

export function ShortcutsDialog({ open, onClose }: ShortcutsDialogProps) {
  const { t } = useTranslation('neoboard');
  const dialogTitleId = useId();
  const dialogDescriptionId = useId();
  const mac = isMacOS();

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
          {t('helpCenter.shortcuts.title', 'Keyboard shortcuts')}
        </DialogTitle>
        <Tooltip title={t('helpCenter.shortcuts.close', 'Close')}>
          <IconButton
            sx={{ mr: 3 }}
            aria-label={t('helpCenter.shortcuts.close', 'Close')}
            onClick={onClose}
          >
            <CloseIcon />
          </IconButton>
        </Tooltip>
      </Stack>
      <DialogContent id={dialogDescriptionId} sx={{ pt: 0 }}>
        {SHORTCUTS.map((shortcut) => {
          const keys = mac
            ? (shortcut.macKeys ?? shortcut.keys)
            : shortcut.keys;
          return (
            <Box
              key={shortcut.labelKey}
              data-testid="shortcut-entry"
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                py: 0.75,
                borderBottom: '1px solid',
                borderColor: 'divider',
                '&:last-child': { borderBottom: 'none' },
              }}
            >
              <Typography variant="body1">
                {t(shortcut.labelKey, shortcut.labelDefault)}
              </Typography>
              <Chip
                data-testid="shortcut-chip"
                sx={{ flexShrink: 0, ml: 2 }}
                label={<HotkeysHelp keys={keys} />}
              />
            </Box>
          );
        })}
      </DialogContent>
      <DialogActions>
        <Button
          onClick={onClose}
          autoFocus
          variant="contained"
          data-testid="shortcuts-dialog-close"
        >
          {t('helpCenter.shortcuts.close', 'Close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
