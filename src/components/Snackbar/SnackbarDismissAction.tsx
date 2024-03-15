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

import CloseIcon from '@mui/icons-material/Close';
import { IconButton } from '@mui/material';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from './useSnackbar';

export function DismissAction() {
  const { t } = useTranslation();
  const { clearSnackbar } = useSnackbar();

  const handleClick = useCallback(() => {
    clearSnackbar();
  }, [clearSnackbar]);

  return (
    <IconButton
      aria-label={t('snackbar.dismissAction', 'Dismiss')}
      onClick={handleClick}
      tabIndex={0}
    >
      <CloseIcon />
    </IconButton>
  );
}

export const SnackbarDismissAction = React.memo(DismissAction);
