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

import { renderHook } from '@testing-library/react';
import { ComponentType, PropsWithChildren } from 'react';
import { WhiteboardManager } from './types';
import {
  WhiteboardManagerProvider,
  useWhiteboardManager,
} from './useWhiteboardManager';

describe('useWhiteboardManager', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let whiteboardManager: jest.Mocked<WhiteboardManager>;

  beforeEach(() => {
    whiteboardManager = {
      getActiveWhiteboardInstance: jest.fn(),
      selectActiveWhiteboardInstance: jest.fn(),
    };

    Wrapper = ({ children }) => {
      return (
        <WhiteboardManagerProvider whiteboardManager={whiteboardManager}>
          {children}
        </WhiteboardManagerProvider>
      );
    };
  });

  it('should return whiteboard manager', () => {
    const { result } = renderHook(() => useWhiteboardManager(), {
      wrapper: Wrapper,
    });

    expect(result.current).toBe(whiteboardManager);
  });

  it('hook should throw without context', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useWhiteboardManager())).toThrow(
      Error(
        'useWhiteboardManager can only be used inside of <WhiteboardManagerProvider>',
      ),
    );

    jest.mocked(console.error).mockRestore();
  });
});
