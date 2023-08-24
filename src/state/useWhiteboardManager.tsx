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

import React, { PropsWithChildren, useContext } from 'react';
import { WhiteboardManager } from './types';

const WhiteboardManagerContext = React.createContext<
  WhiteboardManager | undefined
>(undefined);

export function WhiteboardManagerProvider({
  whiteboardManager,
  children,
}: PropsWithChildren<{
  whiteboardManager: WhiteboardManager;
}>) {
  return (
    <WhiteboardManagerContext.Provider value={whiteboardManager}>
      {children}
    </WhiteboardManagerContext.Provider>
  );
}

export function useWhiteboardManager(): WhiteboardManager {
  const whiteboardManager = useContext(WhiteboardManagerContext);

  if (!whiteboardManager) {
    throw new Error(
      'useWhiteboardManager can only be used inside of <WhiteboardManagerProvider>',
    );
  }

  return whiteboardManager;
}
