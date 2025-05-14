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

import {
  InputBaseComponentProps,
  MenuItem,
  Select,
  SelectChangeEvent,
  Tooltip,
} from '@mui/material';
import { createElement, useState } from 'react';
import {
  LINE_MARKER_TYPES,
  LineMarkerPosition,
} from '../../elements/line/types';

export function LineMarkerSelect({
  position = 'start',
  marker = 'none',
  onChangeMarker = () => {},
  inputProps = {},
}: {
  position?: LineMarkerPosition;
  marker?: string;
  onChangeMarker?: (event: SelectChangeEvent<string>) => void;
  inputProps?: InputBaseComponentProps;
}) {
  const [selectOpen, setSelectOpen] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);

  return (
    <Tooltip
      title={inputProps['aria-label']}
      open={tooltipOpen && !selectOpen}
      onOpen={() => !selectOpen && setTooltipOpen(true)}
      onClose={() => setTooltipOpen(false)}
    >
      <Select
        size="small"
        variant="standard"
        disableUnderline={true}
        value={marker}
        inputProps={inputProps}
        SelectDisplayProps={{
          style: {
            textAlign: 'center',
            padding: '5px 8px 8px 8px',
            height: '20px',
          },
        }}
        IconComponent={() => null}
        open={selectOpen}
        onOpen={() => {
          setSelectOpen(true);
          setTooltipOpen(false);
        }}
        onClose={() => setSelectOpen(false)}
      >
        {LINE_MARKER_TYPES.filter((m) => m.position === position).map(
          (markerType) => (
            <MenuItem
              aria-label={markerType.name}
              key={`${markerType.value}-${markerType.position}`}
              value={markerType.value}
              sx={{
                padding: '8px',
                height: '34px',
                '&.Mui-focusVisible': {
                  outline: 'none',
                  border: 'none',
                },
              }}
              onClick={() => {
                // Create a synthetic event to always trigger onChangeMarker
                const syntheticEvent = {
                  target: { value: markerType.value },
                } as SelectChangeEvent<string>;
                onChangeMarker(syntheticEvent);
              }}
            >
              {createElement(markerType.icon)}
            </MenuItem>
          ),
        )}
      </Select>
    </Tooltip>
  );
}
