/*
 * Copyright 2026 Nordeck IT + Consulting GmbH
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
import { useTranslation } from 'react-i18next';
import { useActiveElements } from '../../state';
import {
  DeleteActiveElementButton,
  DuplicateActiveElementButton,
  ElementColorPicker,
  PathStrokeWidthSelect,
} from '../ElementBar';
import { useLayoutState } from '../Layout';
import { Toolbar } from '../common/Toolbar';

export function PenToolsBar() {
  const { t } = useTranslation('neoboard');
  const toolbarTitle = t('penToolsBar.title', 'Pen');
  const { activeElementIds } = useActiveElements();
  const { activePathStrokeWidth, setActiveColor, setActiveShade } =
    useLayoutState();

  // Only sets the color for the next stroke, the selected elements stay as is
  const handleColorChange = useCallback(
    (color: string, shade?: number) => {
      if (color !== 'transparent') {
        setActiveColor(color);
      }

      if (shade !== undefined) {
        setActiveShade(shade);
      }
    },
    [setActiveColor, setActiveShade],
  );

  return (
    <Toolbar aria-label={toolbarTitle}>
      <PathStrokeWidthSelect
        strokeWidth={activePathStrokeWidth}
        label={t(
          'penToolsBar.selectNextStrokeWidth',
          'Select the next stroke width',
        )}
        applyToSelection={false}
      />
      <ElementColorPicker
        label={t(
          'penToolsBar.pickNextStrokeColor',
          'Pick the next stroke color',
        )}
        onChange={handleColorChange}
        readFromSelection={false}
        placement="above"
      />

      {activeElementIds.length > 0 && (
        <DuplicateActiveElementButton
          label={t('penToolsBar.duplicateLastStroke', 'Duplicate last stroke')}
        />
      )}

      {activeElementIds.length > 0 && (
        <DeleteActiveElementButton
          label={t('penToolsBar.deleteLastStroke', 'Delete last stroke')}
        />
      )}
    </Toolbar>
  );
}

export default React.memo(PenToolsBar);
