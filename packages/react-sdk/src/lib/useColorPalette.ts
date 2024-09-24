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

import { darken, lighten, rgbToHex } from '@mui/material';
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
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

type Shades = [string, string, string, string, string, string, string];
export type Color = {
  label: string;
  color: string;
  shades?: Shades;
};

type UseColorPaletteResult = {
  colorPalette: Color[];
  fallbackColor: Color;
  defaultColor: string;
  defaultShade: number;
  defaultShapeColor: string;
  defaultShapeShade: number;
  defaultTextColor: string | undefined;
  defaultTextShade: number;
};

export const useColorPalette = (
  hasTransparent?: boolean,
): UseColorPaletteResult => {
  const { t } = useTranslation('neoboard');

  return useMemo(() => {
    const greyColor = {
      label: t('colorPicker.colors.grey', 'Grey'),
      color: grey[500],
      shades: calculateShades(grey[500]),
    };

    const amberColor = {
      label: t('colorPicker.colors.amber', 'Amber'),
      color: amber[500],
      shades: calculateShades(amber[500]),
    };

    const colorPalette = [
      ...(hasTransparent
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
        shades: calculateShades(red[500]),
      },
      {
        label: t('colorPicker.colors.pink', 'Pink'),
        color: pink[500],
        shades: calculateShades(pink[500]),
      },
      {
        label: t('colorPicker.colors.purple', 'Purple'),
        color: purple[500],
        shades: calculateShades(purple[500]),
      },
      {
        label: t('colorPicker.colors.deepPurple', 'Deep purple'),
        color: deepPurple[500],
        shades: calculateShades(deepPurple[500]),
      },
      {
        label: t('colorPicker.colors.indigo', 'Indigo'),
        color: indigo[500],
        shades: calculateShades(indigo[500]),
      },
      {
        label: t('colorPicker.colors.blue', 'Blue'),
        color: blue[500],
        shades: calculateShades(blue[500]),
      },
      {
        label: t('colorPicker.colors.lightBlue', 'Light blue'),
        color: lightBlue[500],
        shades: calculateShades(lightBlue[500]),
      },
      {
        label: t('colorPicker.colors.cyan', 'Cyan'),
        color: cyan[500],
        shades: calculateShades(cyan[500]),
      },
      {
        label: t('colorPicker.colors.teal', 'Teal'),
        color: teal[500],
        shades: calculateShades(teal[500]),
      },
      {
        label: t('colorPicker.colors.green', 'Green'),
        color: green[500],
        shades: calculateShades(green[500]),
      },
      {
        label: t('colorPicker.colors.lightGreen', 'Light green'),
        color: lightGreen[500],
        shades: calculateShades(lightGreen[500]),
      },
      {
        label: t('colorPicker.colors.lime', 'Lime'),
        color: lime[500],
        shades: calculateShades(lime[500]),
      },
      {
        label: t('colorPicker.colors.yellow', 'Yellow'),
        color: yellow[500],
        shades: calculateShades(yellow[500]),
      },
      amberColor,
      {
        label: t('colorPicker.colors.orange', 'Orange'),
        color: orange[500],
        shades: calculateShades(orange[500]),
      },
      {
        label: t('colorPicker.colors.deepOrange', 'Deep orange'),
        color: deepOrange[500],
        shades: calculateShades(deepOrange[500]),
      },
      {
        label: t('colorPicker.colors.brown', 'Brown'),
        color: brown[500],
        shades: calculateShades(brown[500]),
      },
      greyColor,
      {
        label: t('colorPicker.colors.blueGrey', 'Blue grey'),
        color: blueGrey[500],
        shades: calculateShades(blueGrey[500]),
      },
      {
        label: t('colorPicker.colors.black', 'Black'),
        color: common.black,
      },
    ];

    return {
      colorPalette,
      fallbackColor: greyColor,
      defaultColor: greyColor.shades[3],
      defaultShade: 3,
      defaultShapeColor: amberColor.shades[0],
      defaultShapeShade: 0,
      // undefined here means "auto" color depending on the contrast
      defaultTextColor: undefined,
      defaultTextShade: 3,
    };
  }, [hasTransparent, t]);
};

function calculateShades(color: string): Shades {
  return [
    rgbToHex(lighten(color, 0.75)),
    rgbToHex(lighten(color, 0.5)),
    rgbToHex(lighten(color, 0.25)),
    color,
    rgbToHex(darken(color, 0.22)),
    rgbToHex(darken(color, 0.44)),
    rgbToHex(darken(color, 0.66)),
  ];
}

export function findColor(color: string, palette: Color[]): Color | undefined {
  return palette.find((c) => c.color === color || c.shades?.includes(color));
}
