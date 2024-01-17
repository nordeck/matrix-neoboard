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

import { useContext, useMemo } from 'react';
import { useElements } from '../../state';
import { Elements } from '../../state/types';
import {
  ElementOverride,
  ElementOverrideGetterContext,
} from './ElementOverridesProvider';

export function useElementOverrides(elementIds: string[]): Elements {
  const getElementOverride = useContext(ElementOverrideGetterContext);

  if (!getElementOverride) {
    throw new Error(
      'useElementOverride can only be used inside of <ElementOverridesProvider>',
    );
  }

  const elements: Elements = useElements(elementIds);

  return useMemo(
    () =>
      Object.fromEntries(
        Object.entries(elements).map(([elementId, element]) => {
          const override: ElementOverride | undefined =
            getElementOverride(elementId);
          return [
            elementId,
            element.type === 'path'
              ? {
                  ...element,
                  position: override?.position ?? element.position,
                }
              : {
                  ...element,
                  height: override?.height ?? element.height,
                  width: override?.width ?? element.width,
                  position: override?.position ?? element.position,
                },
          ];
        }),
      ),
    [elements, getElementOverride],
  );
}
