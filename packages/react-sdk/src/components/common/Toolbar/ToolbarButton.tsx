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
  IconButton,
  IconButtonProps,
  styled,
  Tooltip,
  TooltipProps,
} from '@mui/material';
import { forwardRef } from 'react';
import { TooltipDisabledChildWrapper } from '../TooltipDisabledChildWrapper';
import { useToolbarItem } from './useToolbarItem';

export type ToolbarButtonProps = IconButtonProps & {
  placement?: TooltipProps['placement'];
};

const IconButtonStyled = styled(IconButton)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius,
  color: theme.palette.text.primary,

  '&:active': {
    color: theme.palette.primary.contrastText,
    backgroundColor: theme.palette.primary.main,
  },
}));

export const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  ({ placement, ...props }, ref) => {
    const { additionalProps } = useToolbarItem();

    return (
      <Tooltip title={props['aria-label']} placement={placement}>
        {/* Wrap in span to allow tooltips on disabled button */}
        <TooltipDisabledChildWrapper>
          <IconButtonStyled
            ref={ref}
            size="small"
            {...props}
            {...additionalProps}
          />
        </TooltipDisabledChildWrapper>
      </Tooltip>
    );
  },
);
