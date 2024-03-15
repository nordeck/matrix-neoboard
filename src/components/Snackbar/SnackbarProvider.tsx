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
  SnackbarProps as MuiSnackbarProps,
  Snackbar,
  useTheme,
} from '@mui/material';
import { PropsWithChildren, createContext, useCallback, useState } from 'react';

export type SnackbarProps = MuiSnackbarProps &
  Required<Pick<MuiSnackbarProps, 'key'>> &
  Required<Pick<MuiSnackbarProps, 'message'>>;

export type SnackbarContextState = {
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
};

export const SnackbarContext = createContext<SnackbarContextState | undefined>(
  undefined,
);

/**
 * Simple snackbar manager that allows to show one snackbar at a time.
 */
export function SnackbarProvider({ children }: PropsWithChildren<{}>) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarProps>();

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  const showSnackbar = useCallback(
    (snackbar: SnackbarProps) => {
      setSnackbar(snackbar);
      setOpen(true);
    },
    [setOpen, setSnackbar],
  );

  return (
    <SnackbarContext.Provider
      value={{ showSnackbar, clearSnackbar: handleClose }}
    >
      {snackbar && (
        <Snackbar
          {...snackbar}
          anchorOrigin={{ horizontal: 'center', vertical: 'top' }}
          onClose={handleClose}
          open={open}
          ContentProps={{
            sx: {
              background: theme.palette.background.default,
              color: theme.palette.text.primary,
              flexWrap: 'nowrap',
            },
          }}
        />
      )}
      {children}
    </SnackbarContext.Provider>
  );
}
