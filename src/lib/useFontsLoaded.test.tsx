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

import { act, renderHook, waitFor } from '@testing-library/react';
import { ComponentType, PropsWithChildren } from 'react';
import { FontsLoadedContextProvider, useFontsLoaded } from './useFontsLoaded';

describe('useFontsLoaded', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;

  beforeEach(() => {
    Wrapper = ({ children }: PropsWithChildren<{}>) => (
      <FontsLoadedContextProvider>{children}</FontsLoadedContextProvider>
    );
  });

  it('should return false if the fonts were not loaded', () => {
    const { result } = renderHook(() => useFontsLoaded(), { wrapper: Wrapper });

    expect(result.current).toBe(false);
  });

  it('should return true after the fonts were loaded', async () => {
    let resolveFontFace: () => void = () => {};

    Object.defineProperty(document, 'fonts', {
      value: {
        ready: Promise.resolve([
          {
            loaded: new Promise<void>((resolve) => {
              resolveFontFace = resolve;
            }),
          },
        ]),
      },
    });

    const { result } = renderHook(() => useFontsLoaded(), { wrapper: Wrapper });

    expect(result.current).toBe(false);

    act(() => {
      resolveFontFace();
    });

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });
});
