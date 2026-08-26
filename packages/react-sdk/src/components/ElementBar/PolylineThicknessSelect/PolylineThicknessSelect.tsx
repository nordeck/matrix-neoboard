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
import { useActiveElements, useElements } from '../../../state';
import { useLineThickness } from './useLineThickness';

const STROKE_WIDTHS = [4, 6, 8, 10, 12, 14, 16];

export function PolylineThicknessSelect() {
  const { t } = useTranslation('neoboard');
  const { lineThickness, applyLineThickness } = useLineThickness();

  const { activeElementIds } = useActiveElements();
  const elements = useElements(activeElementIds);

  const strokeWidths = useMemo(
    () =>
      STROKE_WIDTHS.includes(lineThickness)
        ? STROKE_WIDTHS
        : [...STROKE_WIDTHS, lineThickness].sort((a, b) => a - b),
    [lineThickness],
  );

  const hasPolylinePath = Object.values(elements).find(
    (element) => element.type === 'path' && element.kind === 'polyline',
  );

  if (!hasPolylinePath) {
    return null;
  }

  const label = t('elementBar.lineThickness', 'Select Line Thickness');

  return (
    <Select
      size="small"
      variant="standard"
      disableUnderline={true}
      value={lineThickness}
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
        applyLineThickness(event.target.value as number);
      }}
      sx={{
        // Set a min-width to prevent change of the select width depending on the value
        minWidth: '64px',
        padding: '0 5px 0 8px',
      }}
    >
      {strokeWidths.map((value) => {
        return (
          <MenuItem value={value} key={value}>
            {lineThickness === value && (
              <Tooltip title={label}>
                <div>{value}</div>
              </Tooltip>
            )}

            {lineThickness !== value && value}
          </MenuItem>
        );
      })}
    </Select>
  );
}
