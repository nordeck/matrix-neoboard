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

import { red } from '@mui/material/colors';
import { renderHook } from '@testing-library/react';
import { act, ComponentType, PropsWithChildren } from 'react';
import { mockFullscreenApi } from '../../lib/testUtils/documentTestUtils';
import { LayoutStateProvider, useLayoutState } from './useLayoutState';

describe('useLayoutState', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;

  beforeEach(() => {
    Wrapper = ({ children }) => {
      return <LayoutStateProvider>{children}</LayoutStateProvider>;
    };
  });

  it('should start with slide overview hidden', () => {
    const { result } = renderHook(() => useLayoutState(), { wrapper: Wrapper });

    expect(result.current.isSlideOverviewVisible).toBe(false);
  });

  it("should start with collaborators' cursors hidden", () => {
    const { result } = renderHook(() => useLayoutState(), { wrapper: Wrapper });

    expect(result.current.isShowCollaboratorsCursors).toBe(false);
  });

  it('should start with developer tools hidden', () => {
    const { result } = renderHook(() => useLayoutState(), { wrapper: Wrapper });

    expect(result.current.isDeveloperToolsVisible).toBe(false);
  });

  it('should start with activated whiteboard grid', () => {
    const { result } = renderHook(() => useLayoutState(), { wrapper: Wrapper });

    expect(result.current.isShowGrid).toBe(true);
  });

  it('should start with activated select tool', () => {
    const { result } = renderHook(() => useLayoutState(), { wrapper: Wrapper });

    expect(result.current.activeTool).toBe('select');
  });

  it('should start with grey as activate color', () => {
    const { result } = renderHook(() => useLayoutState(), { wrapper: Wrapper });

    expect(result.current.activeColor).toBe('#9e9e9e');
  });

  it('should change visibility of the slide overview', () => {
    const { result } = renderHook(() => useLayoutState(), { wrapper: Wrapper });

    act(() => {
      result.current.setSlideOverviewVisible(true);
    });

    expect(result.current.isSlideOverviewVisible).toBe(true);
  });

  it("should change visibility of collaborators' cursors", () => {
    const { result } = renderHook(() => useLayoutState(), { wrapper: Wrapper });

    act(() => {
      result.current.setShowCollaboratorsCursors(true);
    });

    expect(result.current.isShowCollaboratorsCursors).toBe(true);
  });

  it('should change visibility of the developer tools', () => {
    const { result } = renderHook(() => useLayoutState(), { wrapper: Wrapper });

    act(() => {
      result.current.setDeveloperToolsVisible(true);
    });

    expect(result.current.isDeveloperToolsVisible).toBe(true);
  });

  it('should change deactivate the whiteboard grid', () => {
    const { result } = renderHook(() => useLayoutState(), { wrapper: Wrapper });

    act(() => {
      result.current.setShowGrid(false);
    });

    expect(result.current.isShowGrid).toBe(false);
  });

  it('should change the active tool from select to text', () => {
    const { result } = renderHook(() => useLayoutState(), { wrapper: Wrapper });

    act(() => {
      result.current.setActiveTool('text');
    });

    expect(result.current.activeTool).toBe('text');
  });

  it('should change the active tool from select to arrow', () => {
    const { result } = renderHook(() => useLayoutState(), { wrapper: Wrapper });

    act(() => {
      result.current.setActiveTool('arrow');
    });

    expect(result.current.activeTool).toBe('arrow');
  });

  it('should change the active color to red', () => {
    const { result } = renderHook(() => useLayoutState(), { wrapper: Wrapper });

    act(() => {
      result.current.setActiveColor(red[500]);
    });

    expect(result.current.activeColor).toBe('#f44336');
  });

  describe('fullscreen', () => {
    beforeEach(() => {
      mockFullscreenApi();
    });

    it('should start with fullscreen mode being disabled', () => {
      const { result } = renderHook(() => useLayoutState(), {
        wrapper: Wrapper,
      });

      expect(result.current.isFullscreenMode).toBe(false);
    });

    it('should toggle fullscreen mode', async () => {
      const { result } = renderHook(() => useLayoutState(), {
        wrapper: Wrapper,
      });

      await act(async () => {
        await result.current.setFullscreenMode(true);
      });

      expect(result.current.isFullscreenMode).toBe(true);

      await act(async () => {
        await result.current.setFullscreenMode(false);
      });

      expect(result.current.isFullscreenMode).toBe(false);
    });
  });

  it('should start with empty drag select start coordinates', () => {
    const { result } = renderHook(() => useLayoutState(), { wrapper: Wrapper });

    expect(result.current.dragSelectStartCoords).toBeUndefined();
  });

  it('should set drag select start coordinates', () => {
    const { result } = renderHook(() => useLayoutState(), { wrapper: Wrapper });

    const point = { x: 23, y: 42 };
    act(() => {
      result.current.setDragSelectStartCoords(point);
    });

    expect(result.current.dragSelectStartCoords).toBe(point);
  });
});
