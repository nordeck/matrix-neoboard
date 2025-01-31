/*
 * Copyright 2025 Nordeck IT + Consulting GmbH
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

import { MuiThemeProvider } from '@matrix-widget-toolkit/mui';
import { CssBaseline, ThemeProvider, useTheme } from '@mui/material';
import { deepmerge } from '@mui/utils';
import { PropsWithChildren, useMemo } from 'react';
import theme from './theme';

/**
 * This component wraps the children with both MuiThemeProvider and ThemeProvider,
 * applying the custom fonts and theme settings from the `theme.ts` file.
 */
export function ReactSdkThemeProvider({ children }: PropsWithChildren<{}>) {
  const MuiTheme = useTheme();

  const reactSdkTheme = useMemo(() => {
    return deepmerge(theme, MuiTheme);
  }, [MuiTheme]);

  return (
    <MuiThemeProvider>
      <ThemeProvider theme={reactSdkTheme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </MuiThemeProvider>
  );
}
