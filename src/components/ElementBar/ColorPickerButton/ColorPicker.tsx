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
import { MouseEvent, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useActiveElement,
  useElement,
  useWhiteboardSlideInstance,
} from '../../../state';
import { useLayoutState } from '../../Layout';
import { ToolbarSubMenu } from '../../common/Toolbar';
import { ColorPickerIcon } from './ColorPickerIcon';
import { ColorsGrid } from './ColorsGrid';

export function ColorPicker() {
  const { t } = useTranslation();

  const { activeColor, setActiveColor } = useLayoutState();
  const slideInstance = useWhiteboardSlideInstance();

  const { activeElementId } = useActiveElement();
  const activeElement = useElement(activeElementId);
  const color = activeElement
    ? activeElement.type === 'path'
      ? activeElement.strokeColor
      : activeElement.fillColor
    : activeColor;

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
      setActiveColor(color);

      const activeElementId = slideInstance.getActiveElementId();

      if (activeElementId) {
        const activeElement = slideInstance.getElement(activeElementId);

        if (activeElement?.type === 'path') {
          slideInstance.updateElement(activeElementId, {
            strokeColor: color,
          });
        } else if (activeElement?.type === 'shape') {
          slideInstance.updateElement(activeElementId, {
            fillColor: color,
          });
        }
      }
    },
    [setActiveColor, slideInstance],
  );

  const colorPickerTitle = t('colorPicker.title', 'Pick a color');

  const buttonId = useId();
  const gridId = useId();

  return (
    <>
      {color !== 'transparent' && (
        <ToolbarSubMenu
          aria-controls={open ? gridId : undefined}
          aria-expanded={open ? 'true' : undefined}
          aria-haspopup="grid"
          id={buttonId}
          sx={{ padding: '2px' }}
          onClick={handleClick}
          aria-label={colorPickerTitle}
        >
          <ColorPickerIcon color={color} />
        </ToolbarSubMenu>
      )}

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
