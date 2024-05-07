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
import {
  amber,
  blue,
  blueGrey,
  brown,
  common,
  cyan,
  deepOrange,
  deepPurple,
  green,
  grey,
  indigo,
  lightBlue,
  lightGreen,
  lime,
  orange,
  pink,
  purple,
  red,
  teal,
  yellow,
} from '@mui/material/colors';
import { chunk } from 'lodash';
import { Dispatch, DispatchWithoutAction, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ColorPickerIcon } from './ColorPickerIcon';

export interface ColorsGridProps {
  id?: string;
  activeColor: string;
  onChange?: Dispatch<string>;
  onClose?: DispatchWithoutAction;
  /** If true, the color picker also shows the transparent color */
  showTransparent?: boolean;
}

export function ColorsGrid({
  id,
  activeColor,
  onChange,
  onClose,
  showTransparent,
}: ColorsGridProps) {
  const ref = useRef<HTMLTableElement>(null);
  const { t } = useTranslation();
  const rowColumnCount = 11;
  const [activeFocus, setActiveFocus] = useState(activeColor);

  const colorPalette: Array<{ label: string; color: string }> = [
    ...(showTransparent
      ? [
          {
            label: t('colorPicker.colors.transparent', 'Transparent'),
            color: 'transparent',
          },
        ]
      : []),
    {
      label: t('colorPicker.colors.white', 'White'),
      color: common.white,
    },
    {
      label: t('colorPicker.colors.red', 'Red'),
      color: red[500],
    },
    {
      label: t('colorPicker.colors.pink', 'Pink'),
      color: pink[500],
    },
    {
      label: t('colorPicker.colors.purple', 'Purple'),
      color: purple[500],
    },
    {
      label: t('colorPicker.colors.deepPurple', 'Deep purple'),
      color: deepPurple[500],
    },
    {
      label: t('colorPicker.colors.indigo', 'Indigo'),
      color: indigo[500],
    },
    {
      label: t('colorPicker.colors.blue', 'Blue'),
      color: blue[500],
    },
    {
      label: t('colorPicker.colors.lightBlue', 'Light blue'),
      color: lightBlue[500],
    },
    {
      label: t('colorPicker.colors.cyan', 'Cyan'),
      color: cyan[500],
    },
    {
      label: t('colorPicker.colors.teal', 'Teal'),
      color: teal[500],
    },
    {
      label: t('colorPicker.colors.green', 'Green'),
      color: green[500],
    },
    {
      label: t('colorPicker.colors.lightGreen', 'Light green'),
      color: lightGreen[500],
    },
    {
      label: t('colorPicker.colors.lime', 'Lime'),
      color: lime[500],
    },
    {
      label: t('colorPicker.colors.yellow', 'Yellow'),
      color: yellow[500],
    },
    {
      label: t('colorPicker.colors.amber', 'Amber'),
      color: amber[500],
    },
    {
      label: t('colorPicker.colors.orange', 'Orange'),
      color: orange[500],
    },
    {
      label: t('colorPicker.colors.deepOrange', 'Deep orange'),
      color: deepOrange[500],
    },
    {
      label: t('colorPicker.colors.brown', 'Brown'),
      color: brown[500],
    },
    {
      label: t('colorPicker.colors.grey', 'Grey'),
      color: grey[500],
    },
    {
      label: t('colorPicker.colors.blueGrey', 'Blue grey'),
      color: blueGrey[500],
    },
    {
      label: t('colorPicker.colors.black', 'Black'),
      color: common.black,
    },
  ];

  const colorPickerTitle = t('colorPicker.gridTitle', 'Colors');

  const changeElementsFocus = (elementIndex: number) => {
    const element = ref.current?.querySelectorAll('button').item(elementIndex);
    if (element) {
      element.focus();
      setActiveFocus(colorPalette[elementIndex].color);
    }
  };

  return (
    <table role="grid" aria-label={colorPickerTitle} ref={ref} id={id}>
      <tbody>
        {chunk(colorPalette, rowColumnCount).map(
          (colorRow, indexRow, arrayColorPalette) => (
            <tr key={indexRow}>
              {colorRow.map(({ label, color }, indexColumn) => (
                <td key={color} style={{ padding: 0 }}>
                  <IconButton
                    sx={{ p: 0 }}
                    aria-label={label}
                    tabIndex={activeFocus === color ? 0 : -1}
                    onClick={() => {
                      onChange?.(color);
                      onClose?.();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        onChange?.(color);
                        onClose?.();
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
                    autoFocus={activeColor === color}
                  >
                    <ColorPickerIcon
                      color={color}
                      active={activeColor === color}
                    />
                  </IconButton>
                </td>
              ))}
            </tr>
          ),
        )}
      </tbody>
    </table>
  );
}
