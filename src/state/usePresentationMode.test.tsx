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

import { act, renderHook } from '@testing-library/react-hooks';
import { ComponentType, PropsWithChildren } from 'react';
import { mockWhiteboardManager } from '../lib/testUtils/documentTestUtils';
import { WhiteboardManager } from './types';
import { usePresentationMode } from './usePresentationMode';
import { WhiteboardManagerProvider } from './useWhiteboardManager';

describe('usePresentationMode', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let whiteboardManager: jest.Mocked<WhiteboardManager>;

  beforeEach(() => {
    ({ whiteboardManager } = mockWhiteboardManager());

    Wrapper = ({ children }) => {
      return (
        <WhiteboardManagerProvider whiteboardManager={whiteboardManager}>
          {children}
        </WhiteboardManagerProvider>
      );
    };
  });

  it('should return non-presenting state', async () => {
    const { result } = renderHook(() => usePresentationMode(), {
      wrapper: Wrapper,
    });

    expect(result.current).toEqual({
      state: { type: 'idle' },
      toggleEditMode: expect.any(Function),
      togglePresentation: expect.any(Function),
    });
  });

  it('should start and stop the presentation', async () => {
    const { result } = renderHook(() => usePresentationMode(), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.togglePresentation();
    });

    expect(result.current).toEqual({
      state: { type: 'presenting', isEditMode: false },
      toggleEditMode: expect.any(Function),
      togglePresentation: expect.any(Function),
    });

    act(() => {
      result.current.togglePresentation();
    });

    expect(result.current).toEqual({
      state: { type: 'idle' },
      toggleEditMode: expect.any(Function),
      togglePresentation: expect.any(Function),
    });
  });

  it('should toggle the edit mode', async () => {
    const { result } = renderHook(() => usePresentationMode(), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.togglePresentation();
      result.current.toggleEditMode();
    });

    expect(result.current).toEqual({
      state: { type: 'presenting', isEditMode: true },
      toggleEditMode: expect.any(Function),
      togglePresentation: expect.any(Function),
    });

    act(() => {
      result.current.toggleEditMode();
    });

    expect(result.current).toEqual({
      state: { type: 'presenting', isEditMode: false },
      toggleEditMode: expect.any(Function),
      togglePresentation: expect.any(Function),
    });
  });
});
