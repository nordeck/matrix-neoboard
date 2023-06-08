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

import {
  Checkbox,
  CheckboxProps,
  styled,
  Tooltip,
  TooltipProps,
} from '@mui/material';
import { TooltipDisabledChildWrapper } from '../TooltipDisabledChildWrapper';
import { useToolbarItem } from './useToolbarItem';

export type ToolbarToggleProps = CheckboxProps & {
  placement?: TooltipProps['placement'];
};

const CheckboxStyled = styled(Checkbox)(({ theme }) => ({
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

    '&:active': {
      color: theme.palette.text.primary,
      backgroundColor: theme.palette.action.hover,
    },
  },

  '&.Mui-focusVisible': {
    outlineColor: 'Highlight',
    outlineStyle: 'auto',
    outlineWidth: '2px',
    // Things are doubled here because Highlight is only supported by
    // Firefox
    outline: 'auto 2px -webkit-focus-ring-color',
  },

  '& .MuiSvgIcon-root': {
    fontSize: 'x-large',
  },
}));

export function ToolbarToggle({
  inputProps = {},
  placement,
  ...props
}: ToolbarToggleProps) {
  const { additionalProps } = useToolbarItem();

  return (
    <Tooltip title={inputProps['aria-label']} placement={placement}>
      {/* Wrap in span to allow tooltips on disabled button */}
      <TooltipDisabledChildWrapper>
        <CheckboxStyled
          size="small"
          inputProps={{ ...inputProps, ...additionalProps }}
          {...props}
        />
      </TooltipDisabledChildWrapper>
    </Tooltip>
  );
}
