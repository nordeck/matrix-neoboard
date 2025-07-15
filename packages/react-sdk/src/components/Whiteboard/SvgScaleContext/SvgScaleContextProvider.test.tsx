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

import { render, renderHook } from '@testing-library/react';
import { act, ComponentType, PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as constants from '../constants';
import { SvgScaleContextType, useSvgScaleContext } from './context';
import { SvgScaleContextProvider } from './SvgScaleContextProvider';

describe('SvgScaleContextProvider', () => {
  let contextState: SvgScaleContextType;
  const ContextExtractor = () => {
    contextState = useSvgScaleContext();
    return null;
  };
  let Wrapper: ComponentType<PropsWithChildren<{}>>;

  beforeEach(() => {
    Wrapper = ({ children }) => (
      <SvgScaleContextProvider>
        <ContextExtractor />
        {children}
      </SvgScaleContextProvider>
    );
  });

  describe('in infinite-canvas mode', () => {
    beforeEach(() => {
      vi.spyOn(constants, 'infiniteCanvasMode', 'get').mockReturnValue(true);
      vi.spyOn(constants, 'whiteboardWidth', 'get').mockReturnValue(19200);
      vi.spyOn(constants, 'whiteboardHeight', 'get').mockReturnValue(10800);
    });

    it('should have initial scale and translation', async () => {
      render(<p>Empty</p>, { wrapper: Wrapper });

      expect(contextState.scale).toBe(1);
      expect(contextState.translation).toEqual({
        x: 0,
        y: 0,
      });
    });

    it('should have translation updated', async () => {
      const { result } = renderHook(() => useSvgScaleContext(), {
        wrapper: Wrapper,
      });

      act(() => {
        result.current.updateTranslation(10, 20);
      });

      expect(contextState.translation).toEqual({
        x: 10,
        y: 20,
      });
      expect(result.current.translation).toEqual({
        x: 10,
        y: 20,
      });
    });
  });

  describe('in finite-canvas mode', () => {
    beforeEach(() => {
      vi.spyOn(constants, 'infiniteCanvasMode', 'get').mockReturnValue(false);
      vi.spyOn(constants, 'whiteboardWidth', 'get').mockReturnValue(1920);
      vi.spyOn(constants, 'whiteboardHeight', 'get').mockReturnValue(1080);
    });

    it('if the container has the same size as the board, it should set scale 1 and translate by 50 %', () => {
      render(<p>Empty</p>, { wrapper: Wrapper });

      act(() => {
        contextState.setContainerDimensions({ width: 1920, height: 1080 });
      });

      expect(contextState.scale).toBe(1);
      expect(contextState.translation).toEqual({
        x: 1920 / 2,
        y: 1080 / 2,
      });
    });

    it('if the container is smaller then the board, it should set scale the board down to fit it into the container', () => {
      render(<p>Empty</p>, { wrapper: Wrapper });

      act(() => {
        // Set container to 50 % board size
        contextState.setContainerDimensions({ width: 960, height: 540 });
      });

      // Scale of 50 % expected
      expect(contextState.scale).toBe(0.5);
      // Board should be centred
      expect(contextState.translation).toEqual({
        x: 480,
        y: 270,
      });
    });

    it('if the container is larger then the board, it should set scale the board up to fit it into the container', () => {
      render(<p>Empty</p>, { wrapper: Wrapper });

      act(() => {
        // Set container to 200 % board size
        contextState.setContainerDimensions({ width: 3840, height: 2160 });
      });

      // Scale of 200 % expected
      expect(contextState.scale).toBe(2.0);
      // Board should be centred
      expect(contextState.translation).toEqual({
        x: 1920,
        y: 1080,
      });
    });
  });
});
