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

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { findColor, useColorPalette } from '../../../lib';
import { useActiveElements, useElements } from '../../../state';
import { useLayoutState } from '../../Layout';
import { ColorPicker } from './ColorPicker';
import { ColorPickerIcon } from './ColorPickerIcon';
import { calculateColorChangeUpdates } from './calculateColorChangeUpdates';
import { extractFirstColor } from './extractFirstColor';

/**
 * Color picker will only be displayed if at least an element with a color is selected, such as shapes and paths.
 */
export function ElementColorPicker() {
  const { t } = useTranslation('neoboard');
  const { activeElementIds } = useActiveElements();
  const activeElementsObject = useElements(activeElementIds);
  const activeElements = Object.values(activeElementsObject);
  const {
    activeColor,
    activeShade,
    activeShapeColor,
    activeShapeShade,
    setActiveColor,
    setActiveShade,
    setActiveShapeColor,
    setActiveShapeShade,
  } = useLayoutState();

  const hasShape = activeElements.some((e) => e.type === 'shape');
  const hasOther = activeElements.some((e) => e.type !== 'shape');
  const hasOnlyImages = activeElements.every((e) => e.type === 'image');

  const defaultColor = hasShape ? activeShapeColor : activeColor;
  const defaultShade = hasShape ? activeShapeShade : activeShade;

  const { colorPalette } = useColorPalette();
  const color =
    extractFirstColor(Object.values(activeElements)) ?? defaultColor;
  const paletteColor = findColor(color, colorPalette);
  const shade = paletteColor?.shades?.indexOf(color) ?? defaultShade;

  const setActiveColorAndShade = useCallback(
    (color: string, shade?: number): void => {
      if (color !== 'transparent') {
        if (hasShape) {
          setActiveShapeColor(color);
        }

        if (hasOther) {
          setActiveColor(color);
        }
      }

      if (shade !== undefined) {
        if (hasShape) {
          setActiveShapeShade(shade);
        }

        if (hasOther) {
          setActiveShade(shade);
        }
      }
    },
    [
      setActiveShapeColor,
      setActiveShapeShade,
      setActiveColor,
      setActiveShade,
      hasShape,
      hasOther,
    ],
  );

  if (hasOnlyImages) {
    return null;
  }

  return (
    <ColorPicker
      color={color}
      shade={shade}
      setColor={setActiveColorAndShade}
      calculateUpdatesFn={calculateColorChangeUpdates}
      Icon={ColorPickerIcon}
      label={t('colorPicker.title', 'Pick a color')}
      showTransparent={true}
    />
  );
}
