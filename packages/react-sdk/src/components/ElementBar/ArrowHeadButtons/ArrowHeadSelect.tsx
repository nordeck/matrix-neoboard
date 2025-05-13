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
import { t } from 'i18next';
import { createElement } from 'react';
import {
  LINE_MARKER_TYPES,
  LineMarkerPosition,
} from '../../elements/line/types';

export function ArrowHeadSelect({
  position = 'start',
  marker = 'none',
}: {
  position?: LineMarkerPosition;
  marker?: string;
}) {
  const cappedPosition = position.charAt(0).toUpperCase() + position.slice(1);

  return (
    <>
      <Select
        size="small"
        variant="standard"
        disableUnderline={true}
        value={marker}
        inputProps={{
          'aria-label': t(
            'elementBar.arrow' + cappedPosition,
            'Select Arrow ' + cappedPosition,
          ),
        }}
        SelectDisplayProps={{
          style: {
            textAlign: 'center',
            padding: '4px 8px 8px 8px',
            height: '20px',
          },
        }}
        onChange={() => {}}
        IconComponent={() => null}
      >
        {LINE_MARKER_TYPES.filter((m) => m.position === position).map(
          (marker) => (
            <MenuItem
              key={`${marker.value}-${marker.position}`}
              value={marker.value}
              sx={{
                padding: '8px',
                height: '34px',
              }}
            >
              {createElement(marker.icon)}
            </MenuItem>
          ),
        )}
      </Select>
    </>
  );
}
