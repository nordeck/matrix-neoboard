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

import { IconButton } from '@mui/material';
import { chunk } from 'lodash';
import {
  Dispatch,
  DispatchWithoutAction,
  useCallback,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Color, findColor, useColorPalette } from '../../../lib';
import { ColorPickerIcon } from './ColorPickerIcon';
import { ShadePicker } from './ShadePicker';

export interface ColorsGridProps {
  id?: string;
  activeColor: string;
  activeShade: number;
  onChange?: Dispatch<{ color: string; shade?: number }>;
  onClose?: DispatchWithoutAction;
  /** If true, the color picker also shows the transparent color */
  showTransparent?: boolean;
}

export function ColorsGrid({
  id,
  activeColor,
  activeShade,
  onChange,
  showTransparent,
}: ColorsGridProps) {
  const ref = useRef<HTMLTableElement>(null);
  const { t } = useTranslation('neoboard');
  const { colorPalette, fallbackColor } = useColorPalette(showTransparent);
  const activePaletteColor =
    findColor(activeColor, colorPalette) ?? fallbackColor;

  // base color focus
  const [activeFocus, setActiveFocus] = useState<string>(
    activePaletteColor.color,
  );

  const colorPickerTitle = t('colorPicker.gridTitle', 'Colors');
  const rowColumnCount = 11;

  const changeElementsFocus = (elementIndex: number) => {
    const element = ref.current?.querySelectorAll('button').item(elementIndex);
    if (element) {
      element.focus();
      setActiveFocus(colorPalette[elementIndex].color);
    }
  };

  const handleSelectBaseColor = useCallback(
    (color: Color) => {
      onChange?.({
        color: color.shades?.[activeShade] ?? color.color,
        shade: activeShade,
      });
    },
    [activeColor],
  );

  const handleSelectShade = useCallback(
    (shadeIndex: number) => {
      onChange?.({
        color: activePaletteColor.shades?.[shadeIndex] ?? activeColor,
        shade: shadeIndex,
      });
    },
    [activeColor],
  );

  return (
    <>
      <table role="grid" aria-label={colorPickerTitle} ref={ref} id={id}>
        <tbody>
          {chunk(colorPalette, rowColumnCount).map(
            (colorRow, indexRow, arrayColorPalette) => (
              <tr key={indexRow}>
                {colorRow.map((color, indexColumn) => (
                  <td key={color.color} style={{ padding: 0 }}>
                    <IconButton
                      sx={{ p: 0 }}
                      aria-label={color.label}
                      tabIndex={activeFocus === color.color ? 0 : -1}
                      onClick={() => handleSelectBaseColor(color)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSelectBaseColor(color);
                          e.preventDefault();
                        }

                        if (e.key === 'ArrowLeft') {
                          e.stopPropagation();

                          const previousIndex =
                            rowColumnCount * indexRow + (indexColumn - 1);
                          changeElementsFocus(previousIndex);
                        }

                        if (e.key === 'ArrowRight') {
                          e.stopPropagation();

                          const nextIndex =
                            rowColumnCount * indexRow + (indexColumn + 1);
                          changeElementsFocus(nextIndex);
                        }

                        if (e.key === 'ArrowUp') {
                          const upIndex =
                            rowColumnCount * (indexRow - 1) + indexColumn;
                          changeElementsFocus(upIndex);
                          e.preventDefault();
                        }

                        if (e.key === 'ArrowDown') {
                          const downIndex =
                            rowColumnCount * (indexRow + 1) + indexColumn;
                          changeElementsFocus(downIndex);
                          e.preventDefault();
                        }

                        if (e.key === 'Home') {
                          const firstRowIndex = rowColumnCount * indexRow;
                          changeElementsFocus(firstRowIndex);
                          e.preventDefault();
                          e.stopPropagation();
                        }

                        if (e.ctrlKey && e.key === 'Home') {
                          changeElementsFocus(0);
                          e.preventDefault();
                          e.stopPropagation();
                        }

                        if (e.key === 'End') {
                          const lastRowIndex =
                            rowColumnCount * indexRow + (colorRow.length - 1);
                          changeElementsFocus(lastRowIndex);
                          e.preventDefault();
                          e.stopPropagation();
                        }

                        if (e.ctrlKey && e.key === 'End') {
                          changeElementsFocus(colorPalette.length - 1);
                          e.preventDefault();
                          e.stopPropagation();
                        }

                        if (e.key === 'PageUp') {
                          changeElementsFocus(indexColumn);
                          e.preventDefault();
                          e.stopPropagation();
                        }

                        if (e.key === 'PageDown') {
                          const elementIndexLast =
                            rowColumnCount * (arrayColorPalette.length - 1) +
                            indexColumn;
                          changeElementsFocus(elementIndexLast);
                          e.preventDefault();
                          e.stopPropagation();
                        }
                      }}
                      autoFocus={activePaletteColor.color === color.color}
                    >
                      <ColorPickerIcon
                        color={color.color}
                        active={activePaletteColor.color === color.color}
                      />
                    </IconButton>
                  </td>
                ))}
              </tr>
            ),
          )}
        </tbody>
      </table>
      {activePaletteColor.shades !== undefined ? (
        <ShadePicker
          activeColor={activeColor}
          onShadeSelect={handleSelectShade}
          shades={activePaletteColor.shades}
        />
      ) : null}
    </>
  );
}
