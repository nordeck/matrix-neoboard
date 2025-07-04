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

import React, { PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';
import { Toolbar } from '../common/Toolbar';
import { ElementColorPicker } from './ColorPickerButton/ElementColorPicker';
import { TextColorPicker } from './ColorPickerButton/TextColorPicker';
import { DeleteActiveElementButton } from './DeleteActiveElementButton/DeleteActiveElementButton';
import { DuplicateActiveElementButton } from './DuplicateActiveElementButton';
import { FontFamilyButton } from './FontFamilyButton';
import { FontSizeButton } from './FontSizeButton';
import { LineMarkerButtons } from './LineMarkerButtons';
import { TextAlignmentButtons } from './TextAlignmentButtons';
import { TextBoldButton } from './TextBoldButton';
import { TextItalicButton } from './TextItalicButton';

function ElementBar({
  showTextTools = true,
}: PropsWithChildren<{ showTextTools?: boolean }>) {
  const { t } = useTranslation('neoboard');
  const toolbarTitle = t('elementBar.title', 'Element');

  return (
    <Toolbar aria-label={toolbarTitle}>
      <LineMarkerButtons />
      {showTextTools && (
        <>
          <FontFamilyButton />
          <FontSizeButton />
          <TextBoldButton />
          <TextItalicButton />
          <TextAlignmentButtons />
          <TextColorPicker />
        </>
      )}
      <ElementColorPicker />
      <DuplicateActiveElementButton />
      <DeleteActiveElementButton />
    </Toolbar>
  );
}

export default React.memo(ElementBar);
