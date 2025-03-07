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

import { isEqual } from 'lodash';
import {
  createContext,
  PropsWithChildren,
  useContext,
  useMemo,
  useState,
} from 'react';

type ConnectionPointContextType = {
  /**
   * Is true when start or end resize handle (currently for a line only) is on drag, false otherwise.
   */
  isHandleDragging: boolean;
  setIsHandleDragging: (value: boolean) => void;

  /**
   * Elements to activate connection to.
   */
  connectElementIds: string[];
  setConnectElementIds: (value: string[]) => void;
};

const ConnectionPointContext = createContext<
  ConnectionPointContextType | undefined
>(undefined);

export function ConnectionPointProvider({ children }: PropsWithChildren) {
  const [isHandleDragging, setIsHandleDragging] = useState(false);
  const [connectElementIds, setConnectElementIds] = useState<string[]>([]);

  const context = useMemo(
    () => ({
      isHandleDragging,
      setIsHandleDragging,
      connectElementIds,
      setConnectElementIds: (value: string[]) => {
        setConnectElementIds((old) => (isEqual(old, value) ? old : value));
      },
    }),
    [connectElementIds, isHandleDragging],
  );

  return (
    <ConnectionPointContext.Provider value={context}>
      {children}
    </ConnectionPointContext.Provider>
  );
}

export function useConnectionPoint(): ConnectionPointContextType {
  const context = useContext(ConnectionPointContext);

  if (!context) {
    throw new Error(
      'useConnectionPoint can only be used inside of <ConnectionPointProvider>',
    );
  }

  return context;
}
