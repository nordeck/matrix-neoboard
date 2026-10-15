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
import { useLayoutState } from '../../Layout';
import { useApplyActivePathStrokeWidth } from './useApplyActivePathStrokeWidth';

const STROKE_WIDTHS = [4, 6, 8, 10, 12, 14, 16];

type PathStrokeWidthSelectProps = {
  /**
   * The selected stroke width value.
   */
  strokeWidth: number;
  /**
   * Accessible label of the select. Defaults to "Select stroke width".
   */
  label?: string;
  /**
   * If true (default), the selected stroke width is also applied to the
   * selected polylines. If false, only the active stroke width state is
   * updated.
   */
  applyToSelection?: boolean;
};

export function PathStrokeWidthSelect({
  strokeWidth,
  label,
  applyToSelection = true,
}: PathStrokeWidthSelectProps) {
  const { t } = useTranslation('neoboard');
  const { applyStrokeWidth } = useApplyActivePathStrokeWidth();
  const { setActivePathStrokeWidth } = useLayoutState();

  const strokeWidths = useMemo(() => {
    if (STROKE_WIDTHS.includes(strokeWidth)) {
      return STROKE_WIDTHS;
    }
    return [...STROKE_WIDTHS, strokeWidth].sort((a, b) => a - b);
  }, [strokeWidth]);

  const selectLabel =
    label ?? t('elementBar.polylineStrokeWidth', 'Select stroke width');

  return (
    <Select
      size="small"
      variant="standard"
      disableUnderline={true}
      value={strokeWidth}
      inputProps={{
        'aria-label': selectLabel,
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
        if (applyToSelection) {
          applyStrokeWidth(value);
        }
        setActivePathStrokeWidth(value);
      }}
      sx={{
        // Set a min-width to prevent change of the select width depending on the value
        minWidth: '64px',
        padding: '0 5px 0 8px',

        // Fix for the missing blue outline when dropdown is focused in Firefox
        borderRadius: (theme) => `${theme.shape.borderRadius}px`,
        '&:has(.MuiSelect-select:focus:not([aria-expanded="true"]))': {
          outlineColor: 'Highlight',
          outlineStyle: 'auto',
          outlineWidth: '2px',
          // Things are doubled here because Highlight is only supported by
          // Firefox
          outline: 'auto 2px -webkit-focus-ring-color',
        },
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
