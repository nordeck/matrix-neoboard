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

import loglevel from 'loglevel';
import { useCallback, useEffect, useRef, useState } from 'react';

type UseFullScreenModeResult = {
  /**
   * Whether fullscreen mode is active.
   */
  isFullscreenMode: boolean;
  /**
   * Set fullscreen mode.
   *
   * @param fullscreen - true: enable fullscreen mode; false: disable fullscreen mode
   * @returns A Promise that is resolved after fullscreen has been enabled or disabled.
   */
  setFullscreenMode(fullscreen: boolean): Promise<void>;
};

/**
 * This hook must only be used once in useLayoutState!!
 * It relies on internal state, whether a full-screen request is currently running.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API}
 */
export function useFullscreenMode(): UseFullScreenModeResult {
  /**
   * Whether there is already a full-screen request running.
   */
  const isFullscreenRequestRunning = useRef(false);
  const [isFullscreenMode, setFullscreenModeState] = useState(
    document.fullscreenElement !== null,
  );

  const setFullscreenMode = useCallback(async (value: boolean) => {
    if (isFullscreenRequestRunning.current) {
      // There is already a full-screen request running. Do nothing.
      return;
    }

    isFullscreenRequestRunning.current = true;

    if (value && !document.fullscreenElement) {
      const container =
        document.getElementById('widget-root') ?? document.documentElement;
      try {
        await container.requestFullscreen();
      } catch (error) {
        loglevel.error('Error while going full-screen', error);
      }
    } else if (!value && document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch (error) {
        loglevel.error('Error while leaving full-screen', error);
      }
    }

    isFullscreenRequestRunning.current = false;
  }, []);

  useEffect(() => {
    function listener() {
      setFullscreenModeState(document.fullscreenElement !== null);
    }

    document.addEventListener('fullscreenchange', listener);

    return () => {
      document.removeEventListener('fullscreenchange', listener);
    };
  }, [setFullscreenModeState]);

  return {
    isFullscreenMode,
    setFullscreenMode,
  };
}
