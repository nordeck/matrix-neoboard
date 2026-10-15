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
import {
  useActiveElements,
  useElements,
  useWhiteboardSlideInstance,
} from '../../../state';
import { useLayoutState } from '../../Layout';
import { ColorPicker } from './ColorPicker';
import { ColorPickerIcon } from './ColorPickerIcon';
import { calculateColorChangeUpdates } from './calculateColorChangeUpdates';
import { extractFirstColor } from './extractFirstColor';

export type ElementColorPickerProps = {
  /** Accessible label of the picker button. Defaults to "Pick a color". */
  label?: string;
  /**
   * If true (default), the displayed color is taken from the selected
   * elements. If false, the color is taken from the Layout State.
   */
  readFromSelection?: boolean;
  /** Where the popover opens relative to the button. Defaults to 'below'. */
  placement?: 'above' | 'below';
  /**
   * Called when the user picks a color. Will replace the default handler: the color is stored as the
   * active color and applied to the selected elements.
   */
  onChange?: (color: string, shade?: number) => void;
};

/**
 * Color picker that by default get it's color from selected elements and applies the new color to the elements and the layout state
 */
export function ElementColorPicker({
  label,
  readFromSelection = true,
  placement,
  onChange,
}: ElementColorPickerProps = {}) {
  const { t } = useTranslation('neoboard');
  const slideInstance = useWhiteboardSlideInstance();
  const { activeElementIds } = useActiveElements();
  const activeElementsObject = useElements(activeElementIds);
  const activeElements = readFromSelection
    ? Object.values(activeElementsObject)
    : [];
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

  const handleChange = useCallback(
    (color: string, shade?: number) => {
      setActiveColorAndShade(color, shade);
      const updates = calculateColorChangeUpdates(activeElementsObject, color);

      if (updates.length) {
        slideInstance.updateElements(updates);
      }
    },
    [activeElementsObject, setActiveColorAndShade, slideInstance],
  );

  return (
    <ColorPicker
      color={color}
      shade={shade}
      onChange={onChange ?? handleChange}
      Icon={ColorPickerIcon}
      label={label ?? t('colorPicker.title', 'Pick a color')}
      showTransparent={true}
      placement={placement}
    />
  );
}
