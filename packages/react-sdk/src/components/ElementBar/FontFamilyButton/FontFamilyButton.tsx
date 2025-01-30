/*
 * Copyright 2025 Nordeck IT + Consulting GmbH
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
import { useFontFamily } from '../../../lib/text-formatting/useFontFamily';
import { TextFontFamily } from '../../../state/crdt/documents/elements';

const FONT_FAMILIES = [
  'Abel',
  'Actor',
  'Adamina',
  'Chewy',
  'Gwendolyn',
  'Inter',
  'Pirata One',
];

export function FontFamilyButton() {
  const { t } = useTranslation('neoboard');
  const { fontFamily, setFontFamily } = useFontFamily();
  return (
    <Select
      size="small"
      variant="standard"
      disableUnderline={true}
      value={fontFamily ?? 'Inter'} // Default font style is 'Inter'
      inputProps={{
        'aria-label': t('elementBar.fontForm', 'Select font family'),
      }}
      SelectDisplayProps={{
        style: {
          textAlign: 'center',
          paddingRight: '8px',
          paddingTop: '4px',
        },
      }}
      onChange={(event) => {
        setFontFamily(event.target.value as TextFontFamily);
      }}
      sx={{
        // Set a min-width to prevent change of the select width depending on the value
        minWidth: '128px', // Adjusted to provide more space for longer font names
        padding: '0 5px 0 8px',
      }}
    >
      {FONT_FAMILIES.map((font) => (
        <MenuItem
          value={font}
          key={font}
          sx={{
            fontFamily: font,
          }}
        >
          {font}
        </MenuItem>
      ))}
    </Select>
  );
}
