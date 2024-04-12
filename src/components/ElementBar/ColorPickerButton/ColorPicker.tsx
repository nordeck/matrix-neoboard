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
import { ComponentType, MouseEvent, useCallback, useState } from 'react';
import {
  useActiveElements,
  useElements,
  useWhiteboardSlideInstance,
} from '../../../state';
import { ElementUpdate, Elements } from '../../../state/types';
import { ToolbarSubMenu } from '../../common/Toolbar';
import { ColorsGrid } from './ColorsGrid';

export type ColorPickerProps = {
  color?: string;
  setColor?: (color: string) => void;
  /** The icon component to be used for the colour picker in the element bar */
  Icon: ComponentType<{ color: string }>;
  /** Function that calculates the element updates to apply the colour change */
  calculateUpdatesFn: (elements: Elements, color: string) => ElementUpdate[];
  label: string;
};

export function ColorPicker({
  color,
  setColor,
  calculateUpdatesFn,
  Icon,
  label,
}: ColorPickerProps) {
  const slideInstance = useWhiteboardSlideInstance();
  const { activeElementIds } = useActiveElements();
  const activeElements = useElements(activeElementIds);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleOnChange = useCallback(
    (color: string) => {
      setColor?.(color);
      const updates = calculateUpdatesFn(activeElements, color);

      if (updates.length) {
        slideInstance.updateElements(updates);
      }
    },
    [activeElements, calculateUpdatesFn, setColor, slideInstance],
  );

  const buttonId = useId();
  const gridId = useId();

  if (color === undefined || color === 'transparent') {
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
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        componentsProps={{
          backdrop: {
            // Make sure to close the context menu if the user clicks on the
            // backdrop
            onContextMenu: (e) => {
              e.preventDefault();
              handleClose();
            },
          },
        }}
      >
        <ColorsGrid
          id={gridId}
          activeColor={color}
          onChange={handleOnChange}
          onClose={handleClose}
        />
      </Popover>
    </>
  );
}
