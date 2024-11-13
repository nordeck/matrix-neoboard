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

import { SnackbarProps as MuiSnackbarProps, useTheme } from '@mui/material';
import {
  PropsWithChildren,
  createContext,
  useCallback,
  useMemo,
  useState,
} from 'react';

export type SnackbarProps = MuiSnackbarProps &
  Required<Pick<MuiSnackbarProps, 'key'>> &
  Required<Pick<MuiSnackbarProps, 'message'>> & {
    /**
     * Whether this is a priority snackbar.
     * Can only be replaced by another priority snackbar.
     * Other non-priority snackbars won't replace it unless clearSnackbar was called.
     */
    priority?: boolean;
  };

export type SnackbarState = {
  /**
   * Clear the snackbar.
   */
  clearSnackbar: () => void;
  /**
   * Show the snackbar.
   *
   * @param snackbar - MUI Snackbar props {@link SnackbarProps}
   */
  showSnackbar: (snackbar: SnackbarProps) => void;
  /**
   * Props to render the snackbar.
   * Undefined if there should be no snackbar.
   */
  snackbarProps: MuiSnackbarProps | undefined;
};

export const SnackbarContext = createContext<SnackbarState | undefined>(
  undefined,
);

/**
 * Simple snackbar manager that allows to show one snackbar at a time.
 */
export function SnackbarProvider({ children }: PropsWithChildren<{}>) {
  const theme = useTheme();
  const [extraSnackbarProps, setExtraSnackbarProps] = useState<
    SnackbarProps | undefined
  >(undefined);

  const handleClose = useCallback(() => {
    setExtraSnackbarProps(undefined);
  }, [setExtraSnackbarProps]);

  const showSnackbar = useCallback(
    (snackbarProps: SnackbarProps) => {
      if (
        extraSnackbarProps?.priority === true &&
        snackbarProps.priority === false
      ) {
        // Do not replace a priority snackbar with non-priority one.
        return;
      }

      setExtraSnackbarProps(snackbarProps);
    },
    [extraSnackbarProps?.priority, setExtraSnackbarProps],
  );

  const snackbarProps: MuiSnackbarProps | undefined = useMemo(() => {
    if (extraSnackbarProps === undefined) {
      return undefined;
    }

    return {
      ...extraSnackbarProps,
      anchorOrigin: { horizontal: 'center', vertical: 'top' },
      onClose: handleClose,
      open: true,
      ContentProps: {
        sx: {
          background: theme.palette.background.default,
          color: theme.palette.text.primary,
          flexWrap: 'nowrap',
        },
      },
      ClickAwayListenerProps: {
        // Deactivate dismiss the snack bar by clicking anywhere
        onClickAway: () => {},
      },
    };
  }, [
    extraSnackbarProps,
    handleClose,
    theme.palette.background.default,
    theme.palette.text.primary,
  ]);

  return (
    <SnackbarContext.Provider
      value={{
        showSnackbar,
        clearSnackbar: handleClose,
        snackbarProps,
      }}
    >
      {children}
    </SnackbarContext.Provider>
  );
}
