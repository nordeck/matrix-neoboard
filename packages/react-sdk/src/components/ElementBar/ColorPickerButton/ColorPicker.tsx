/*
 * Copyright 2022 Nordeck IT + Consulting GmbH
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

import { Popover } from '@mui/material';
import { unstable_useId as useId } from '@mui/utils';
import {
  ComponentType,
  MouseEvent,
  useCallback,
  useMemo,
  useState,
} from 'react';
import { ToolbarSubMenu } from '../../common/Toolbar';
import { ColorsGrid } from './ColorsGrid';

export type ColorPickerProps = {
  color?: string;
  shade: number;
  /**
   * Called when the user picks a color.
   */
  onChange: (color: string, shade?: number) => void;
  /** The icon component to be used for the color picker in the element bar */
  Icon: ComponentType<{ color: string }>;
  label: string;
  /** If true, the color picker also shows the transparent color */
  showTransparent?: boolean;
  /**
   * Where the popover opens relative to the button. Use 'above' if the
   * toolbar is close to the bottom edge of the screen. Defaults to 'below'.
   */
  placement?: 'above' | 'below';
};

export function ColorPicker({
  color,
  shade,
  onChange,
  Icon,
  label,
  showTransparent,
  placement = 'below',
}: ColorPickerProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const buttonId = useId();
  const gridId = useId();

  const componentsProps = useMemo(
    () => ({
      backdrop: {
        // Make sure to close the context menu if the user clicks on the
        // backdrop
        onContextMenu: (e: MouseEvent) => {
          e.preventDefault();
          handleClose();
        },
      },
    }),
    [handleClose],
  );

  const handleOnChange = useCallback(
    ({ color, shade }: { color: string; shade?: number }) => {
      onChange?.(color, shade);
    },
    [onChange],
  );

  if (color === undefined) {
    return null;
  }

  return (
    <>
      <ToolbarSubMenu
        aria-controls={open ? gridId : undefined}
        aria-expanded={open ? 'true' : undefined}
        aria-haspopup="grid"
        id={buttonId}
        sx={{ height: '34px', padding: '0', width: '34px' }}
        onClick={handleClick}
        aria-label={label}
      >
        <Icon color={color} />
      </ToolbarSubMenu>

      <Popover
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: placement === 'above' ? 'top' : 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: placement === 'above' ? 'bottom' : 'top',
          horizontal: 'center',
        }}
        componentsProps={componentsProps}
      >
        <ColorsGrid
          id={gridId}
          activeColor={color}
          activeShade={shade}
          onChange={handleOnChange}
          onClose={handleClose}
          showTransparent={showTransparent}
        />
      </Popover>
    </>
  );
}
