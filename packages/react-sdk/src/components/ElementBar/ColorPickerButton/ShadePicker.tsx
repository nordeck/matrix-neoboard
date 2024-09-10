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

import { Box, Divider, SxProps, useTheme } from '@mui/material';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

type ShadePickerProps = {
  activeColor: string;
  onShadeSelect: (index: number) => void;
  shades: string[];
};

export const ShadePicker: React.FC<ShadePickerProps> = function ({
  activeColor,
  onShadeSelect,
  shades,
}) {
  const { t } = useTranslation('neoboard');
  const theme = useTheme();
  const shadeLabels = useMemo(() => {
    return [
      t('colorPicker.shade_lightest', 'lightest'),
      t('colorPicker.shade_lighter', 'lighter'),
      t('colorPicker.shade_light', 'light'),
      t('colorPicker.shade_base', 'base'),
      t('colorPicker.shade_dark', 'dark'),
      t('colorPicker.shade_darker', 'darker'),
      t('colorPicker.shade_darkest', 'darkest'),
    ];
  }, []);

  const shadeElements = shades.map((shade, index) => {
    let extra: SxProps = {};
    if (shade === activeColor) {
      extra = {
        borderColor: theme.palette.primary.main,
        borderStyle: 'solid',
        borderWidth: '4px',
        margin: '-2px',
        zIndex: 1,
      };
    }

    return (
      <Box
        key={index}
        role="radio"
        aria-label={shadeLabels[index]}
        aria-checked={shade === activeColor}
        onClick={() => onShadeSelect(index)}
        sx={{
          backgroundColor: shade,
          cursor: 'pointer',
          flexGrow: '1',
          ...extra,
        }}
      />
    );
  });

  return (
    <>
      <Divider sx={{ marginLeft: '8px', marginRight: '8px' }} />
      <Box
        role="radiogroup"
        aria-label={t('colorPicker.shade', 'Shade')}
        sx={{ display: 'flex', height: '15px', margin: '8px' }}
      >
        {shadeElements}
      </Box>
    </>
  );
};
