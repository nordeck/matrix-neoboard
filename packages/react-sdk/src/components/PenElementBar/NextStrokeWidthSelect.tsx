/*
 * Copyright 2026 Nordeck IT + Consulting GmbH
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
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLayoutState } from '../Layout';

const STROKE_WIDTHS = [4, 6, 8, 10, 12, 14, 16];

/**
 * Select for the stroke width of the next stroke (curve).
 */
export function NextStrokeWidthSelect() {
  const { t } = useTranslation('neoboard');
  const { activePolylineStrokeWidth, setActivePolylineStrokeWidth } =
    useLayoutState();

  const strokeWidths = useMemo(() => {
    if (STROKE_WIDTHS.includes(activePolylineStrokeWidth)) {
      return STROKE_WIDTHS;
    }
    return [...STROKE_WIDTHS, activePolylineStrokeWidth].sort((a, b) => a - b);
  }, [activePolylineStrokeWidth]);

  const label = t(
    'penElementBar.selectNextStrokeWidth',
    'Select the next stroke width',
  );

  return (
    <Select
      size="small"
      variant="standard"
      disableUnderline={true}
      value={activePolylineStrokeWidth}
      inputProps={{
        'aria-label': label,
      }}
      SelectDisplayProps={{
        style: {
          textAlign: 'center',
          paddingRight: '18px',
          paddingTop: '4px',
        },
      }}
      onChange={(event) => {
        setActivePolylineStrokeWidth(event.target.value as number);
      }}
      sx={{
        // Set a min-width to prevent change of the select width depending on the value
        minWidth: '64px',
        padding: '0 5px 0 8px',
      }}
    >
      {strokeWidths.map((value) => (
        <MenuItem value={value} key={value}>
          {value}
        </MenuItem>
      ))}
    </Select>
  );
}
