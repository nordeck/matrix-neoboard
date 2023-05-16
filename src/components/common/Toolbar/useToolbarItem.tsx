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

import { unstable_useId as useId } from '@mui/utils';
import {
  createContext,
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
} from 'react';

export type ToolbarState = {
  focusedToolbarKey: string | undefined;
  registerToolbarKey: (toolbarKey: string) => void;
  setFocusedToolbarKey: Dispatch<SetStateAction<string | undefined>>;
};

export const ToolbarStateContext = createContext<ToolbarState | undefined>(
  undefined
);

export function useToolbarItem() {
  const context = useContext(ToolbarStateContext);
  const toolbarKey = useId()!;

  if (!context) {
    throw new Error('useToolbarItem can only be used inside of <Toolbar>');
  }

  const { focusedToolbarKey, setFocusedToolbarKey, registerToolbarKey } =
    context;

  useEffect(() => {
    // focus the first rendered item in the toolbar
    registerToolbarKey(toolbarKey);
  }, [registerToolbarKey, setFocusedToolbarKey, toolbarKey]);

  const handleFocus = useCallback(() => {
    if (toolbarKey !== undefined) {
      setFocusedToolbarKey(toolbarKey);
    }
  }, [toolbarKey, setFocusedToolbarKey]);

  const tabIndex = focusedToolbarKey === toolbarKey ? 0 : -1;

  return { additionalProps: { onFocus: handleFocus, tabIndex } };
}
