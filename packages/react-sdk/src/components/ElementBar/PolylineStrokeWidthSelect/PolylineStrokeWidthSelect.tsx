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

import { MenuItem, Select, Tooltip } from '@mui/material';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLayoutState } from '../../Layout';
import { usePolylineStrokeWidth } from './usePolylineStrokeWidth';

const STROKE_WIDTHS = [4, 6, 8, 10, 12, 14, 16];

export function PolylineStrokeWidthSelect() {
  const { t } = useTranslation('neoboard');
  const { strokeWidth, applyStrokeWidth } = usePolylineStrokeWidth();
  const { setActivePolylineStrokeWidth } = useLayoutState();

  const strokeWidths = useMemo(() => {
    if (strokeWidth === undefined || STROKE_WIDTHS.includes(strokeWidth)) {
      return STROKE_WIDTHS;
    }
    return [...STROKE_WIDTHS, strokeWidth].sort((a, b) => a - b);
  }, [strokeWidth]);

  const label = t('elementBar.polylineStrokeWidth', 'Select Stroke Width');

  return (
    <Select
      size="small"
      variant="standard"
      disableUnderline={true}
      value={strokeWidth}
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
        const value = event.target.value as number;
        applyStrokeWidth(value);
        setActivePolylineStrokeWidth(value);
      }}
      // renderValue only adds the tooltip to the dropdown, not the list items.
      // Tooltip needs a real DOM element (ex. div), plain value won't work.
      renderValue={(value) => (
        <Tooltip title={label}>
          <div>{value}</div>
        </Tooltip>
      )}
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
