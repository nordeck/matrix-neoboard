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

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { findColor, useColorPalette } from '../../lib';
import { ColorPicker } from '../ElementBar/ColorPickerButton/ColorPicker';
import { ColorPickerIcon } from '../ElementBar/ColorPickerButton/ColorPickerIcon';
import { useLayoutState } from '../Layout';

export function NextStrokeColorPicker() {
  const { t } = useTranslation('neoboard');
  const { activeColor, activeShade, setActiveColor, setActiveShade } =
    useLayoutState();

  const { colorPalette } = useColorPalette();
  const color = activeColor;
  const paletteColor = findColor(color, colorPalette);
  const shade = paletteColor?.shades?.indexOf(color) ?? activeShade;

  const setActiveColorAndShade = useCallback(
    (color: string, shade?: number): void => {
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
    <ColorPicker
      color={color}
      shade={shade}
      setColor={setActiveColorAndShade}
      calculateUpdatesFn={() => []}
      Icon={ColorPickerIcon}
      label={t(
        'penElementBar.pickNextStrokeColor',
        'Pick the next stroke color',
      )}
      showTransparent={true}
    />
  );
}
