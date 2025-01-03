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
import { findColor, findForegroundColor, useColorPalette } from '../../../lib';
import {
  includesShapeWithText,
  includesTextShape,
  useActiveElements,
  useElements,
} from '../../../state';
import { useLayoutState } from '../../Layout';
import { ColorPicker } from './ColorPicker';
import { TextColorPickerIcon } from './TextColorPickerIcon';
import { calculateTextColorChangeUpdates } from './calculateTextColorChangeUpdates';
import { extractFirstTextColor } from './extractFirstTextColor';

export function TextColorPicker() {
  const { t } = useTranslation('neoboard');
  const {
    activeTextShade,
    activeShapeTextShade,
    setActiveTextColor,
    setActiveTextShade,
    setActiveShapeTextColor,
    setActiveShapeTextShade,
  } = useLayoutState();
  const { colorPalette } = useColorPalette();

  const { activeElementIds } = useActiveElements();
  const activeElementsObject = useElements(activeElementIds);
  const activeElements = Object.values(activeElementsObject);

  const hasText = includesTextShape(activeElements);
  const hasTextShape = includesShapeWithText(activeElements);

  const defaultShade = hasTextShape ? activeShapeTextShade : activeTextShade;

  let color = extractFirstTextColor(activeElements);
  if (color == undefined) {
    const element = activeElements[0];
    if (element && 'fillColor' in element) {
      color = findForegroundColor(element.fillColor);
    }
  }

  const paletteColor =
    color !== undefined ? findColor(color, colorPalette) : undefined;
  const shade =
    (color !== undefined && paletteColor !== undefined
      ? paletteColor.shades?.indexOf(color)
      : defaultShade) ?? defaultShade;

  const handleChange = useCallback(
    (color: string, shade?: number) => {
      if (hasText) {
        setActiveTextColor(color);

        if (shade !== undefined) {
          setActiveTextShade(shade);
        }
      }

      if (hasTextShape) {
        setActiveShapeTextColor(color);

        if (shade !== undefined) {
          setActiveShapeTextShade(shade);
        }
      }
    },
    [
      hasText,
      hasTextShape,
      setActiveTextColor,
      setActiveTextShade,
      setActiveShapeTextColor,
      setActiveShapeTextShade,
    ],
  );

  return (
    <ColorPicker
      calculateUpdatesFn={calculateTextColorChangeUpdates}
      color={color}
      shade={shade}
      setColor={handleChange}
      Icon={TextColorPickerIcon}
      label={t('textColorPicker.title', 'Pick a text color')}
    />
  );
}
