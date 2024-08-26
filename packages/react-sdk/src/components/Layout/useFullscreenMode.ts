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

import { useCallback, useEffect, useState } from 'react';

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
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API}
 */
export function useFullscreenMode(): UseFullScreenModeResult {
  const [isFullscreenMode, setFullscreenModeState] = useState(
    document.fullscreenElement !== null,
  );

  const setFullscreenMode = useCallback((value: boolean) => {
    if (value && !document.fullscreenElement) {
      const container =
        document.getElementById('widget-root') ?? document.documentElement;
      return container.requestFullscreen();
    }

    if (!value && document.fullscreenElement) {
      return document.exitFullscreen();
    }

    return Promise.resolve();
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
