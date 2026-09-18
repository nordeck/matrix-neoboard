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

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useActiveElements } from '../../state';
import { DeleteActiveElementButton } from '../ElementBar/DeleteActiveElementButton/DeleteActiveElementButton';
import { DuplicateActiveElementButton } from '../ElementBar/DuplicateActiveElementButton';
import { Toolbar } from '../common/Toolbar';
import { NextStrokeColorPicker } from './NextStrokeColorPicker';

export function PenElementBar() {
  const { t } = useTranslation('neoboard');
  const toolbarTitle = t('penElementBar.title', 'Pen');
  const { activeElementIds } = useActiveElements();

  return (
    <Toolbar aria-label={toolbarTitle}>
      <NextStrokeColorPicker />
      <DuplicateActiveElementButton
        label={t(
          'penElementBar.duplicatePreviousStroke',
          'Duplicate previous stroke',
        )}
      />
      {activeElementIds.length > 0 && (
        <DeleteActiveElementButton
          label={t(
            'penElementBar.deletePreviousStroke',
            'Delete previous stroke',
          )}
        />
      )}
    </Toolbar>
  );
}

export default React.memo(PenElementBar);
