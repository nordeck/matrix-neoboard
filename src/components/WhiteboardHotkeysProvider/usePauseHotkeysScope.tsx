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

import { createContext, useContext, useEffect } from 'react';
import { useHotkeysContext } from 'react-hotkeys-hook';

export const ScopePauseReferenceCountContext = createContext<
  Map<string, number> | undefined
>(undefined);

export function usePauseHotkeysScope(scope: string, paused = true): void {
  const scopePauseReferenceCount = useContext(ScopePauseReferenceCountContext);

  if (!scopePauseReferenceCount) {
    throw new Error(
      'usePauseHotkeysScope can only be used inside a WhiteboardHotkeysProvider'
    );
  }

  const { enableScope, disableScope } = useHotkeysContext();

  useEffect(() => {
    if (paused) {
      const count = (scopePauseReferenceCount.get(scope) ?? 0) + 1;
      scopePauseReferenceCount.set(scope, count);

      disableScope(scope);
    }

    return () => {
      if (paused) {
        const count = (scopePauseReferenceCount.get(scope) ?? 0) - 1;
        scopePauseReferenceCount.set(scope, count);

        if (count <= 0) {
          enableScope(scope);
        }
      }
    };
  }, [disableScope, enableScope, paused, scope, scopePauseReferenceCount]);
}
