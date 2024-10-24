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

import { IconButton, styled } from '@mui/material';
import { chunk } from 'lodash';
import {
  Dispatch,
  DispatchWithoutAction,
  KeyboardEventHandler,
  useCallback,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Color, findColor, useColorPalette } from '../../../lib';
import { ColorPickerIcon } from './ColorPickerIcon';
import { ShadePicker } from './ShadePicker';

const ZeroPaddingTd = styled('td')({
  padding: 0,
});

interface ColorTDProps {
  activeFocus: string;
  activePaletteColor: Color;
  arrayColorPalette: Color[][];
  color: Color;
  colorPalette: Color[];
  colorRow: Color[];
  indexColumn: number;
  indexRow: number;
  rowColumnCount: number;
  onChangeElementsFocus: (index: number) => void;
  onSelectBaseColor: (color: Color) => void;
}

function ColorTD({
  activeFocus,
  activePaletteColor,
  arrayColorPalette,
  color,
  colorPalette,
  colorRow,
  indexColumn,
  indexRow,
  rowColumnCount,
  onChangeElementsFocus,
  onSelectBaseColor,
}: ColorTDProps) {
  const handleKeyDown: KeyboardEventHandler = useCallback(
    (e) => {
      if (e.key === 'Enter') {
        onSelectBaseColor(color);
        e.preventDefault();
      }

      if (e.key === 'ArrowLeft') {
        e.stopPropagation();

        const previousIndex = rowColumnCount * indexRow + (indexColumn - 1);
        onChangeElementsFocus(previousIndex);
      }

      if (e.key === 'ArrowRight') {
        e.stopPropagation();

        const nextIndex = rowColumnCount * indexRow + (indexColumn + 1);
        onChangeElementsFocus(nextIndex);
      }

      if (e.key === 'ArrowUp') {
        const upIndex = rowColumnCount * (indexRow - 1) + indexColumn;
        onChangeElementsFocus(upIndex);
        e.preventDefault();
      }

      if (e.key === 'ArrowDown') {
        const downIndex = rowColumnCount * (indexRow + 1) + indexColumn;
        onChangeElementsFocus(downIndex);
        e.preventDefault();
      }

      if (e.key === 'Home') {
        const firstRowIndex = rowColumnCount * indexRow;
        onChangeElementsFocus(firstRowIndex);
        e.preventDefault();
        e.stopPropagation();
      }

      if (e.ctrlKey && e.key === 'Home') {
        onChangeElementsFocus(0);
        e.preventDefault();
        e.stopPropagation();
      }

      if (e.key === 'End') {
        const lastRowIndex = rowColumnCount * indexRow + (colorRow.length - 1);
        onChangeElementsFocus(lastRowIndex);
        e.preventDefault();
        e.stopPropagation();
      }

      if (e.ctrlKey && e.key === 'End') {
        onChangeElementsFocus(colorPalette.length - 1);
        e.preventDefault();
        e.stopPropagation();
      }

      if (e.key === 'PageUp') {
        onChangeElementsFocus(indexColumn);
        e.preventDefault();
        e.stopPropagation();
      }

      if (e.key === 'PageDown') {
        const elementIndexLast =
          rowColumnCount * (arrayColorPalette.length - 1) + indexColumn;
        onChangeElementsFocus(elementIndexLast);
        e.preventDefault();
        e.stopPropagation();
      }
    },
    [
      arrayColorPalette,
      color,
      colorPalette,
      colorRow,
      indexColumn,
      indexRow,
      rowColumnCount,
      onChangeElementsFocus,
      onSelectBaseColor,
    ],
  );

  return (
    <ZeroPaddingTd>
      <IconButton
        aria-label={color.label}
        autoFocus={activePaletteColor.color === color.color}
        sx={{ p: 0 }}
        tabIndex={activeFocus === color.color ? 0 : -1}
        onClick={useCallback(
          () => onSelectBaseColor(color),
          [color, onSelectBaseColor],
        )}
        onKeyDown={handleKeyDown}
      >
        <ColorPickerIcon
          active={activePaletteColor.color === color.color}
          color={color.color}
        />
      </IconButton>
    </ZeroPaddingTd>
  );
}

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

  const handleChangeElementsFocus = useCallback(
    (elementIndex: number) => {
      const element = ref.current
        ?.querySelectorAll('button')
        .item(elementIndex);
      if (element) {
        element.focus();
        setActiveFocus(colorPalette[elementIndex].color);
      }
    },
    [colorPalette],
  );

  const handleSelectBaseColor = useCallback(
    (color: Color) => {
      onChange?.({
        color: color.shades?.[activeShade] ?? color.color,
        shade: activeShade,
      });
    },
    [activeShade, onChange],
  );

  const handleSelectShade = useCallback(
    (shadeIndex: number) => {
      onChange?.({
        color: activePaletteColor.shades?.[shadeIndex] ?? activeColor,
        shade: shadeIndex,
      });
    },
    [activeColor, activePaletteColor.shades, onChange],
  );

  return (
    <>
      <table role="grid" aria-label={colorPickerTitle} ref={ref} id={id}>
        <tbody>
          {chunk(colorPalette, rowColumnCount).map(
            (colorRow, indexRow, arrayColorPalette) => (
              <tr key={indexRow}>
                {colorRow.map((color, indexColumn) => (
                  <ColorTD
                    key={color.color}
                    activeFocus={activeFocus}
                    activePaletteColor={activePaletteColor}
                    arrayColorPalette={arrayColorPalette}
                    color={color}
                    colorPalette={colorPalette}
                    colorRow={colorRow}
                    indexColumn={indexColumn}
                    indexRow={indexRow}
                    rowColumnCount={rowColumnCount}
                    onSelectBaseColor={handleSelectBaseColor}
                    onChangeElementsFocus={handleChangeElementsFocus}
                  />
                ))}
              </tr>
            ),
          )}
        </tbody>
      </table>
      {activePaletteColor.shades !== undefined ? (
        <ShadePicker
          activeColor={activeColor}
          shades={activePaletteColor.shades}
          onShadeSelect={handleSelectShade}
        />
      ) : null}
    </>
  );
}
