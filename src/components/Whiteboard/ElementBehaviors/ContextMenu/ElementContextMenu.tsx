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
  Box,
  ListItemText,
  Menu,
  MenuItem,
  PopoverPosition,
  Typography,
} from '@mui/material';
import { first, last } from 'lodash';
import { MouseEvent, PropsWithChildren, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useActiveElement,
  useSlideElementIds,
  useSlideIsLocked,
  useWhiteboardSlideInstance,
} from '../../../../state';
import { HotkeysHelp } from '../../../common/HotkeysHelp';
import { isMacOS } from '../../../common/platform';

type ContextMenuState =
  | { elementId: string; position: PopoverPosition }
  | undefined;

export function ElementContextMenu({
  children,
  elementId,
  readOnly,
}: PropsWithChildren<{ elementId: string; readOnly?: boolean }>) {
  const { t } = useTranslation();
  const isLocked = useSlideIsLocked();
  const [state, setState] = useState<ContextMenuState>();
  const { activeElementId } = useActiveElement();
  const slideInstance = useWhiteboardSlideInstance();
  const elementIds = useSlideElementIds();

  const canMoveUp = activeElementId && last(elementIds) !== activeElementId;
  const canMoveDown = activeElementId && first(elementIds) !== activeElementId;

  const handleClose = useCallback(() => {
    setState(undefined);
  }, []);

  const handleClickBringToFront = useCallback(() => {
    if (activeElementId) {
      slideInstance.moveElementToTop(activeElementId);
      handleClose();
    }
  }, [activeElementId, handleClose, slideInstance]);

  const handleClickBringToBack = useCallback(() => {
    if (activeElementId) {
      slideInstance.moveElementToBottom(activeElementId);
      handleClose();
    }
  }, [activeElementId, handleClose, slideInstance]);

  const handleDelete = useCallback(() => {
    if (activeElementId) {
      slideInstance.removeElement(activeElementId);
      handleClose();
    }
  }, [activeElementId, handleClose, slideInstance]);

  const handleContextMenu = useCallback(
    (event: MouseEvent<SVGElement>) => {
      event.preventDefault();
      setState((state) =>
        !state
          ? {
              position: { left: event.clientX + 2, top: event.clientY - 6 },
              elementId,
            }
          : undefined
      );
    },
    [elementId]
  );

  const handleClickBringForward = useCallback(() => {
    if (activeElementId) {
      slideInstance.moveElementUp(activeElementId);
      handleClose();
    }
  }, [activeElementId, handleClose, slideInstance]);

  const handleClickBringBackward = useCallback(() => {
    if (activeElementId) {
      slideInstance.moveElementDown(activeElementId);
      handleClose();
    }
  }, [activeElementId, handleClose, slideInstance]);

  const menuTitle = t('elementContextMenu.title', 'Element');
  const open = Boolean(state);
  return (
    <>
      <Box
        component="g"
        onContextMenu={handleContextMenu}
        data-testid="element-context-menu-container"
      >
        {children}
      </Box>

      <Menu
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
        MenuListProps={{
          'aria-label': menuTitle,
          dense: true,
          sx: { minWidth: '242px' },
        }}
        open={open && !isLocked && !readOnly}
        onClose={handleClose}
        anchorReference="anchorPosition"
        anchorPosition={state?.position}
      >
        <MenuItem onClick={handleClickBringForward} disabled={!canMoveUp}>
          <ListItemText>
            {t('elementContextMenu.bringForward', 'Bring forward')}
          </ListItemText>
          <Typography variant="body2" color="text.secondary">
            <HotkeysHelp keys={isMacOS() ? 'meta+arrowup' : 'ctrl+arrowup'} />
          </Typography>
        </MenuItem>
        <MenuItem
          divider
          onClick={handleClickBringBackward}
          disabled={!canMoveDown}
        >
          <ListItemText>
            {t('elementContextMenu.bringBackward', 'Bring backward')}
          </ListItemText>
          <Typography variant="body2" color="text.secondary">
            <HotkeysHelp
              keys={isMacOS() ? 'meta+arrowdown' : 'ctrl+arrowdown'}
            />
          </Typography>
        </MenuItem>
        <MenuItem onClick={handleClickBringToFront} disabled={!canMoveUp}>
          <ListItemText>
            {t('elementContextMenu.bringToFront', 'Bring to front')}
          </ListItemText>
        </MenuItem>
        <MenuItem
          divider
          onClick={handleClickBringToBack}
          disabled={!canMoveDown}
        >
          <ListItemText>
            {t('elementContextMenu.bringToBack', 'Bring to back')}
          </ListItemText>
        </MenuItem>

        <MenuItem onClick={handleDelete}>
          <ListItemText sx={{ color: 'error.main' }}>
            {t('elementContextMenu.deleteElement', 'Delete')}
          </ListItemText>
          <Typography variant="body2" color="text.secondary">
            <HotkeysHelp keys={isMacOS() ? 'backspace' : 'delete'} />
          </Typography>
        </MenuItem>
      </Menu>
    </>
  );
}
