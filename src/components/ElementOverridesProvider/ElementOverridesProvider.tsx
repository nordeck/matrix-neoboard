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

import { createContext, PropsWithChildren, useCallback, useState } from 'react';
import { Point } from '../../state';

export type ElementOverride = {
  height?: number;
  width?: number;
  position?: Point;
};

export type ElementOverrides = Record<string, ElementOverride>;

export type ElementOverrideGetter = (
  elementId: string
) => ElementOverride | undefined;
export const ElementOverrideGetterContext =
  createContext<ElementOverrideGetter>(() => undefined);

export type ElementOverrideSetter = (
  elementId: string,
  elementCoords: ElementOverride | undefined
) => void;
export const ElementOverrideSetterContext =
  createContext<ElementOverrideSetter>(() => {});

export function ElementOverridesProvider({ children }: PropsWithChildren<{}>) {
  const [elementOverrides, setElementOverrides] = useState<ElementOverrides>(
    {}
  );

  const getElementOverride = useCallback(
    (elementId: string) => elementOverrides[elementId],
    [elementOverrides]
  );

  const setElementOverride = useCallback(
    (elementId: string, elementCoords: ElementOverride | undefined) => {
      setElementOverrides((old) => {
        const newState = { ...old };

        if (elementCoords) {
          newState[elementId] = elementCoords;
        } else {
          delete newState[elementId];
        }

        return newState;
      });
    },
    []
  );

  return (
    <ElementOverrideSetterContext.Provider value={setElementOverride}>
      <ElementOverrideGetterContext.Provider value={getElementOverride}>
        {children}
      </ElementOverrideGetterContext.Provider>
    </ElementOverrideSetterContext.Provider>
  );
}
