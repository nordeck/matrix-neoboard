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

import React, { useCallback } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useSvgScaleContext } from '../../Whiteboard/SvgScaleContext';
import { zoomStep } from '../../Whiteboard/constants';
import { HOTKEY_SCOPE_WHITEBOARD } from '../../WhiteboardHotkeysProvider';
import { isMacOS } from '../../common/platform';

export const ZoomShortcuts: React.FC = function () {
  const { updateScale, setScale } = useSvgScaleContext();

  const resetZoom = useCallback(() => {
    setScale(1.0);
  }, [setScale]);

  const handleZoomIn = useCallback(() => {
    updateScale(zoomStep);
  }, [updateScale]);

  const handleZoomOut = useCallback(() => {
    updateScale(-zoomStep);
  }, [updateScale]);

  useHotkeys(
    '*',
    (event: KeyboardEvent) => {
      const modifier = isMacOS() ? event.metaKey : event.ctrlKey;

      if ((event.key === '+' || event.key === '=') && modifier) {
        event.preventDefault();
        handleZoomIn();
      }

      if (event.key === '-' && modifier) {
        event.preventDefault();
        handleZoomOut();
      }
    },
    {
      preventDefault: false,
      enableOnContentEditable: true,
      scopes: HOTKEY_SCOPE_WHITEBOARD,
      useKey: true,
    },
    [handleZoomIn, handleZoomOut],
  );

  useHotkeys(
    isMacOS() ? 'meta+0' : 'ctrl+0',
    (event: KeyboardEvent) => {
      event.preventDefault();
      resetZoom();
    },
    {
      preventDefault: false,
      enableOnContentEditable: true,
      scopes: HOTKEY_SCOPE_WHITEBOARD,
      useKey: true,
    },
    [resetZoom],
  );

  return null;
};
