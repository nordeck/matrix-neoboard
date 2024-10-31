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

import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { Box, Button, useTheme } from '@mui/material';
import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useNetworkState } from 'react-use';
import { useSnackbar } from '../../components/Snackbar';

type ConnectionState = 'online' | 'no_internet_connection';

export type ConnectionStateState = {
  connectionState: ConnectionState;
  connectionStateDialogOpen: boolean;
  handleCloseConnectionStateDialog: () => void;
};

export const ConnectionStateContext = createContext<
  ConnectionStateState | undefined
>(undefined);

export const ConnectionStateProvider: React.FC<PropsWithChildren> = function ({
  children,
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { clearSnackbar, showSnackbar, snackbarProps } = useSnackbar();
  const networkState = useNetworkState();
  const [connectionStateDialogOpen, setConnectionStateDialogOpen] =
    useState(false);
  const connectionState: ConnectionState = networkState.online
    ? 'online'
    : 'no_internet_connection';

  const handleLearnMoreClick = useCallback(() => {
    setConnectionStateDialogOpen(true);
  }, [setConnectionStateDialogOpen]);

  /**
   * Monitor the connection state.
   * Display a snackbar on connection errors.
   */
  useEffect(() => {
    if (connectionState === 'online') {
      // Online - no connection state snackbar and no dialog
      clearSnackbar();
      setConnectionStateDialogOpen(false);
      return;
    }

    if (connectionStateDialogOpen) {
      // Give priority to the connection state dialog
      clearSnackbar();
      return;
    }

    if (connectionState === 'no_internet_connection') {
      const changesNotSavedMessage = t(
        'connectionState.snackbar.message',
        'Changes not saved',
      );

      if (snackbarProps?.key === changesNotSavedMessage) {
        // Do not replace the message with itself
        return;
      }

      showSnackbar({
        key: changesNotSavedMessage,
        priority: true,
        message: (
          <Box
            sx={{
              alignItems: 'center',
              display: 'flex',
              gap: theme.spacing(2),
            }}
          >
            <WarningAmberIcon color="warning" />
            {changesNotSavedMessage}
          </Box>
        ),
        action: (
          <Button size="small" onClick={handleLearnMoreClick}>
            {t('connectionState.snackbar.action', 'learn more')}
          </Button>
        ),
      });
      return;
    }
  }, [
    clearSnackbar,
    connectionState,
    connectionStateDialogOpen,
    handleLearnMoreClick,
    setConnectionStateDialogOpen,
    showSnackbar,
    snackbarProps,
    t,
    theme,
  ]);

  const handleCloseConnectionStateDialog = useCallback(() => {
    setConnectionStateDialogOpen(false);
  }, [setConnectionStateDialogOpen]);

  return (
    <ConnectionStateContext.Provider
      value={{
        handleCloseConnectionStateDialog,
        connectionState,
        connectionStateDialogOpen,
      }}
    >
      {children}
    </ConnectionStateContext.Provider>
  );
};
