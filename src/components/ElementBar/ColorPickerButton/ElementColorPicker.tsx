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

import { useTranslation } from 'react-i18next';
import { useActiveElements, useElements } from '../../../state';
import { useLayoutState } from '../../Layout';
import { ColorPicker } from './ColorPicker';
import { ColorPickerIcon } from './ColorPickerIcon';
import { calculateColorChangeUpdates } from './calculateColorChangeUpdates';
import { extractFirstNonTransparentOrFirstColor } from './extractFirstNonTransparentOrFirstColor';

export function ElementColorPicker() {
  const { t } = useTranslation();
  const { activeElementIds } = useActiveElements();
  const activeElements = useElements(activeElementIds);
  const { activeColor, setActiveColor } = useLayoutState();
  const color =
    extractFirstNonTransparentOrFirstColor(Object.values(activeElements)) ??
    activeColor;

  return (
    <ColorPicker
      color={color}
      setColor={setActiveColor}
      calculateUpdatesFn={calculateColorChangeUpdates}
      Icon={ColorPickerIcon}
      label={t('colorPicker.title', 'Pick a color')}
    />
  );
}
