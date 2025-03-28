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

import { MenuItem, Select } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useFontSize } from '../../../lib/text-formatting';
import { useActiveElements, useElements } from '../../../state';

const FONT_SIZES = [8, 16, 24, 32, 48, 64, 96, 128, 160, 192];

export function FontSizeButton() {
  const { t } = useTranslation('neoboard');
  const { fontSize, setFontSize } = useFontSize();

  const { activeElementIds } = useActiveElements();
  const activeElements = useElements(activeElementIds);
  const elements = Object.values(activeElements);

  if (elements.every((element) => element.type !== 'shape')) {
    return null;
  }

  return (
    <Select
      size="small"
      variant="standard"
      disableUnderline={true}
      value={fontSize ?? 'auto'}
      inputProps={{
        'aria-label': t('elementBar.fontSize', 'Select font size'),
      }}
      SelectDisplayProps={{
        style: {
          textAlign: 'center',
          paddingRight: '18px',
          paddingTop: '4px',
        },
      }}
      onChange={(event) => {
        setFontSize(
          event.target.value === 'auto'
            ? undefined
            : (event.target.value as number),
        );
      }}
      sx={{
        // Set a min-width to prevent change of the select width depending on the value
        minWidth: '64px',
        padding: '0 5px 0 8px',
      }}
    >
      <MenuItem value="auto">auto</MenuItem>
      {FONT_SIZES.map((fontSize) => (
        <MenuItem value={fontSize} key={fontSize}>
          {fontSize}
        </MenuItem>
      ))}
    </Select>
  );
}
