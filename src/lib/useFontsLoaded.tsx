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

import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from 'react';
import { from, mergeAll, switchMap } from 'rxjs';

export const FontsLoadedContext = createContext<boolean>(false);

export function FontsLoadedContextProvider({
  children,
}: PropsWithChildren<{}>) {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    // 1. wait until the fontFaceSet is ready (i.e. we known which fonts we are waiting for).
    // 2. wait until the first font is loaded. Not all fonts will resolve because they might not be used (yet).
    const subscription = from(document.fonts.ready)
      .pipe(
        switchMap((fontFaceSet) =>
          [...fontFaceSet].map((fontFace) => fontFace.loaded),
        ),
        mergeAll(),
      )
      .subscribe(() => {
        setFontsLoaded(true);
      });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <FontsLoadedContext.Provider value={fontsLoaded}>
      {children}
    </FontsLoadedContext.Provider>
  );
}

/**
 * @returns if true, all relevant fonts are loaded
 */
export function useFontsLoaded(): boolean {
  return useContext(FontsLoadedContext);
}
