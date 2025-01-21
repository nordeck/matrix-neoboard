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
import { getLogger } from 'loglevel';
import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useNetworkState } from 'react-use';
import { useActiveWhiteboardInstance } from '../../state';
import { useAppDispatch } from '../../store';
import {
  selectConnectionInfo,
  setSnapshotSuccessful,
} from '../../store/connectionInfoSlice';
import { useAppSelector } from '../../store/reduxToolkitHooks';
import { useSnackbar } from '../Snackbar';

const logger = getLogger('ConnectionStateProvider');

const RETRY_INTERVAL = 10_000;

type ConnectionState = 'online' | 'no_internet_connection';

export type ConnectionStateState = {
  connectionState: ConnectionState;
  connectionStateDialogOpen: boolean;
  handleCloseConnectionStateDialog: () => void;
};

export type SnapshotLoadState = {
  snapshotLoadDialogOpen: boolean;
  handleCloseSnapshotLoadDialog: () => void;
};

export const ConnectionStateContext = createContext<
  (ConnectionStateState & SnapshotLoadState) | undefined
>(undefined);

export const ConnectionStateProvider: React.FC<PropsWithChildren> = function ({
  children,
}) {
  const theme = useTheme();
  const whiteboard = useActiveWhiteboardInstance(false);
  const dispatch = useAppDispatch();
  const pendingSendSnapshot = useRef(false);
  const { t } = useTranslation('neoboard');
  const { clearSnackbar, showSnackbar, snackbarProps } = useSnackbar();
  /**
   * Basic connection monitoring. Works if there is any network connection and is highly browser-dependent.
   * Read more about it {@link https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine|here}.
   */
  const networkState = useNetworkState();
  const [connectionStateDialogOpen, setConnectionStateDialogOpen] =
    useState(false);
  const [snapshotLoadDialogOpen, setSnapshotLoadDialogOpen] = useState(false);
  const connectionInfo = useAppSelector(selectConnectionInfo);
  const connectionState: ConnectionState = networkState.online
    ? 'online'
    : 'no_internet_connection';

  const handleLearnMoreClick = useCallback(() => {
    setConnectionStateDialogOpen(true);
  }, [setConnectionStateDialogOpen]);

  /**
   * Monitor load snapshot state. Display dialog if snapshot load failed.
   */
  useEffect(() => {
    if (!connectionInfo.snapshotLoadFailed) {
      // No load snapshot error - no dialog
      setSnapshotLoadDialogOpen(false);
      return;
    }

    setSnapshotLoadDialogOpen(true);
  }, [
    connectionInfo.snapshotLoadFailed,
    snapshotLoadDialogOpen,
    setSnapshotLoadDialogOpen,
  ]);

  /**
   * Monitor send snapshot state. Display a snackbar on errors.
   */
  useEffect(() => {
    if (connectionInfo.snapshotFailed === false) {
      // No send snapshot error - no connection state snackbar and no dialog
      clearSnackbar();
      setConnectionStateDialogOpen(false);
      return;
    }

    if (connectionStateDialogOpen) {
      // Give priority to the connection state dialog
      clearSnackbar();
      return;
    }

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
  }, [
    clearSnackbar,
    connectionState,
    connectionStateDialogOpen,
    connectionInfo.snapshotFailed,
    handleLearnMoreClick,
    setConnectionStateDialogOpen,
    showSnackbar,
    snackbarProps,
    t,
    theme,
  ]);

  // Determine whether to retry snapshots.
  const shouldRetrySendSnapshot = useMemo(() => {
    if (whiteboard === undefined) {
      // There is no whiteboard, reset snapshot state and return
      logger.debug('Retry snapshot: No retry, because there is no whiteboard');
      return false;
    }

    if (connectionInfo.snapshotFailed === false) {
      // Do not retry, if there is no error
      logger.debug(
        'Retry snapshot: No retry, because there is no failed snapshot',
      );
      return false;
    }

    if (connectionState !== 'online') {
      // Do not retry, if we know there is a connection error
      logger.debug(
        'Retry snapshot: No retry, because there is no online connection',
      );
      return false;
    }

    logger.debug('Retry snapshot: Should retry');
    return true;
  }, [connectionState, connectionInfo.snapshotFailed, whiteboard]);

  // Actually retry to send the snapshot.
  useEffect(() => {
    if (shouldRetrySendSnapshot === false) {
      // Snapshots should not be retried
      return;
    }

    if (whiteboard === undefined) {
      // Do not retry, if there is no whiteboard
      return;
    }

    const retrySendSnapshot = async () => {
      if (pendingSendSnapshot.current === true) {
        // Do not retry, if a snapshot is pending
        return;
      }

      pendingSendSnapshot.current = true;

      try {
        await whiteboard.persist();
        dispatch(setSnapshotSuccessful());
        return true;
      } catch {
        return false;
      } finally {
        pendingSendSnapshot.current = false;
      }
    };

    let intervalId: ReturnType<typeof setInterval>;

    retrySendSnapshot()
      .then((result) => {
        if (result === false) {
          // Retry failed, set up retry interval
          intervalId = setInterval(retrySendSnapshot, RETRY_INTERVAL);
        }

        return;
      })
      .catch(() => {
        // Ignore
      });

    return () => {
      clearInterval(intervalId);
    };
  }, [dispatch, shouldRetrySendSnapshot, whiteboard]);

  const handleCloseConnectionStateDialog = useCallback(() => {
    setConnectionStateDialogOpen(false);
  }, [setConnectionStateDialogOpen]);

  const handleCloseSnapshotLoadDialog = useCallback(() => {
    setSnapshotLoadDialogOpen(false);
  }, [setSnapshotLoadDialogOpen]);

  return (
    <ConnectionStateContext.Provider
      value={{
        handleCloseConnectionStateDialog,
        connectionState,
        connectionStateDialogOpen,
        handleCloseSnapshotLoadDialog,
        snapshotLoadDialogOpen,
      }}
    >
      {children}
    </ConnectionStateContext.Provider>
  );
};
