/*
 * Copyright 2023 Nordeck IT + Consulting GmbH
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

import { Radio, RadioProps, styled, Tooltip } from '@mui/material';
import { KeyboardEvent, useCallback, useRef } from 'react';
import { TooltipDisabledChildWrapper } from '../TooltipDisabledChildWrapper';
import { useToolbarItem } from './useToolbarItem';

export type ToolbarRadioProps = RadioProps;

const RadioStyled = styled(Radio)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius,
  color: theme.palette.text.primary,
  padding: 5,

  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },

  '&:active': {
    color: theme.palette.primary.contrastText,
    backgroundColor: theme.palette.primary.main,
  },

  '&.Mui-checked': {
    color: theme.palette.primary.contrastText,
    backgroundColor: theme.palette.primary.main,
  },

  '&.Mui-focusVisible': {
    outlineColor: 'Highlight',
    outlineStyle: 'auto',
    outlineWidth: '2px',
    // Things are doubled here because Highlight is only supported by
    // Firefox
    outline: 'auto 2px -webkit-focus-ring-color',

    // disable the radio outline
    '&& svg': {
      outline: 'none',
    },
  },

  '& .MuiSvgIcon-root': {
    fontSize: 'x-large',
  },
}));

export function ToolbarRadio({ inputProps = {}, ...props }: ToolbarRadioProps) {
  const { additionalProps } = useToolbarItem();

  const ref = useRef<HTMLInputElement>(null);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // The enter key should select a radio button in a toolbar
    // https://developer.mozilla.org/en-US/docs/web/accessibility/aria/roles/radiogroup_role#keyboard_interactions
    if (event.code === 'Enter') {
      ref.current?.click();
      event.preventDefault();
    }
  }, []);

  return (
    <Tooltip title={inputProps['aria-label']}>
      {/* Wrap in span to allow tooltips on disabled button */}
      <TooltipDisabledChildWrapper>
        <RadioStyled
          inputRef={ref}
          inputProps={inputProps}
          onKeyDown={handleKeyDown}
          {...additionalProps}
          {...props}
        />
      </TooltipDisabledChildWrapper>
    </Tooltip>
  );
}
