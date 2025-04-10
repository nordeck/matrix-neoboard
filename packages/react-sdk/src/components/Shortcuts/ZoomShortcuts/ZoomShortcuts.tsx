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

export const ZoomShortcuts: React.FC = function () {
  const { updateScale } = useSvgScaleContext();

  const handleZoom = useCallback(
    (keyboardEvent: KeyboardEvent) => {
      if (
        (keyboardEvent.ctrlKey || keyboardEvent.metaKey) &&
        keyboardEvent.key === '+'
      ) {
        keyboardEvent.preventDefault();
        updateScale(zoomStep);
      } else if (
        (keyboardEvent.ctrlKey || keyboardEvent.metaKey) &&
        keyboardEvent.key === '-'
      ) {
        keyboardEvent.preventDefault();
        updateScale(-zoomStep);
      }
    },
    [updateScale],
  );

  useHotkeys(
    '*',
    handleZoom,
    {
      preventDefault: false,
      enableOnContentEditable: true,
      scopes: HOTKEY_SCOPE_WHITEBOARD,
    },
    [handleZoom],
  );

  return null;
};
