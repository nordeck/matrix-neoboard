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

import React, { useCallback, useMemo } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useSvgScaleContext } from '../../Whiteboard/SvgScaleContext';
import { zoomStep } from '../../Whiteboard/constants';
import { HOTKEY_SCOPE_WHITEBOARD } from '../../WhiteboardHotkeysProvider';
import { isMacOS } from '../../common/platform';

export const ZoomShortcuts: React.FC = function () {
  const { updateScale, setScale } = useSvgScaleContext();

  const handleResetZoom = useCallback(() => {
    setScale(1.0);
  }, [setScale]);

  const handleZoomIn = useCallback(() => {
    updateScale(zoomStep);
  }, [updateScale]);

  const handleZoomOut = useCallback(() => {
    updateScale(-zoomStep);
  }, [updateScale]);

  const macOs = useMemo(() => isMacOS(), []);

  const isEventToApply = useCallback(
    (event: KeyboardEvent) =>
      (macOs && event.metaKey) || (!macOs && event.ctrlKey),
    [macOs],
  );

  useHotkeys(
    ['+', '='],
    (event: KeyboardEvent) => {
      if (isEventToApply(event)) {
        handleZoomIn();
      }
    },
    {
      preventDefault: true,
      scopes: HOTKEY_SCOPE_WHITEBOARD,
      useKey: true,
      splitKey: '_', // needed, otherwise '+' is not applied
    },
    [handleZoomIn, isEventToApply],
  );

  useHotkeys(
    '-',
    (event: KeyboardEvent) => {
      if (isEventToApply(event)) {
        handleZoomOut();
      }
    },
    {
      preventDefault: true,
      scopes: HOTKEY_SCOPE_WHITEBOARD,
      useKey: true,
    },
    [handleZoomOut, isEventToApply],
  );

  useHotkeys(
    ['0'],
    (event: KeyboardEvent) => {
      if (isEventToApply(event)) {
        handleResetZoom();
      }
    },
    {
      preventDefault: true,
      scopes: HOTKEY_SCOPE_WHITEBOARD,
      useKey: true,
    },
    [handleResetZoom, isEventToApply],
  );

  return null;
};
