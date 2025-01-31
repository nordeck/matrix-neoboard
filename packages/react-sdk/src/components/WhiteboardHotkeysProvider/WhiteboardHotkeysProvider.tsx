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

import { PropsWithChildren, useRef } from 'react';
import { HotkeysProvider } from 'react-hotkeys-hook';
import { ScopePauseReferenceCountContext } from './usePauseHotkeysScope';

// Scope for hotkeys that should never be disabled.
export const HOTKEY_SCOPE_GLOBAL = 'global';
// Scope for hotkeys related to the whiteboard.
export const HOTKEY_SCOPE_WHITEBOARD = 'whiteboard';

export function WhiteboardHotkeysProvider({ children }: PropsWithChildren<{}>) {
  const scopePauseReferenceCountRef = useRef(new Map());

  return (
    <HotkeysProvider
      // We must have at least two scopes so we can disable one. Otherwise it
      // falls back to '*' which enables all scopes.
      initiallyActiveScopes={[HOTKEY_SCOPE_WHITEBOARD, HOTKEY_SCOPE_GLOBAL]}
    >
      <ScopePauseReferenceCountContext.Provider
        value={scopePauseReferenceCountRef}
      >
        {children}
      </ScopePauseReferenceCountContext.Provider>
    </HotkeysProvider>
  );
}
