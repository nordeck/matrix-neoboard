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

import { getEnvironment } from '@matrix-widget-toolkit/mui';
import { act, renderHook } from '@testing-library/react';
import { ComponentType, PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, Mocked, vi } from 'vitest';
import { mockFrameElement, mockWhiteboardManager } from '../lib/testUtils';
import { WhiteboardManager } from './types';
import { usePresentationMode } from './usePresentationMode';
import { WhiteboardManagerProvider } from './useWhiteboardManager';

vi.mock('@matrix-widget-toolkit/mui', async () => ({
  ...(await vi.importActual<typeof import('@matrix-widget-toolkit/mui')>(
    '@matrix-widget-toolkit/mui',
  )),
  getEnvironment: vi.fn(),
}));

describe('usePresentationMode', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let whiteboardManager: Mocked<WhiteboardManager>;

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

  it('should start and stop the presentation in infinite canvas mode', async () => {
    vi.mocked(getEnvironment).mockImplementation((name, defaultValue) =>
      name === 'REACT_APP_INFINITE_CANVAS' ? 'true' : defaultValue,
    );

    ({ whiteboardManager } = mockWhiteboardManager({
      slides: [['slide-0', [['frame-0', mockFrameElement()]]]],
    }));

    const activeWhiteboard = whiteboardManager.getActiveWhiteboardInstance()!;

    const { result } = renderHook(() => usePresentationMode(), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.togglePresentation('frame-0');
    });

    expect(result.current).toEqual({
      state: { type: 'presenting', isEditMode: false },
      toggleEditMode: expect.any(Function),
      togglePresentation: expect.any(Function),
    });

    expect(activeWhiteboard.getActiveFrameElementId()).toBe('frame-0');

    act(() => {
      result.current.togglePresentation();
    });

    expect(result.current).toEqual({
      state: { type: 'idle' },
      toggleEditMode: expect.any(Function),
      togglePresentation: expect.any(Function),
    });

    expect(activeWhiteboard.getActiveFrameElementId()).toBe(undefined);
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
