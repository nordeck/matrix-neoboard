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
  useActiveElements,
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
}: PropsWithChildren<{ elementId: string }>) {
  const { t } = useTranslation();
  const isLocked = useSlideIsLocked();
  const [state, setState] = useState<ContextMenuState>();
  const { activeElementIds } = useActiveElements();
  const slideInstance = useWhiteboardSlideInstance();
  const elementIds = useSlideElementIds();

  const canMoveUp =
    activeElementIds.length === 1 && last(elementIds) !== activeElementIds[0];
  const canMoveTop = canMoveUp || activeElementIds.length > 1;
  const canMoveDown =
    activeElementIds.length === 1 && first(elementIds) !== activeElementIds[0];
  const canMoveBottom = canMoveDown || activeElementIds.length > 1;

  const handleClose = useCallback(() => {
    setState(undefined);
  }, []);

  const handleClickBringToFront = useCallback(() => {
    if (activeElementIds.length > 0) {
      slideInstance.moveElementsToTop(activeElementIds);
      handleClose();
    }
  }, [activeElementIds, handleClose, slideInstance]);

  const handleClickBringToBack = useCallback(() => {
    if (activeElementIds.length > 0) {
      slideInstance.moveElementsToBottom(activeElementIds);
      handleClose();
    }
  }, [activeElementIds, handleClose, slideInstance]);

  const handleDelete = useCallback(() => {
    if (activeElementIds.length === 1) {
      slideInstance.removeElement(activeElementIds[0]);
      handleClose();
    }
  }, [activeElementIds, handleClose, slideInstance]);

  const handleContextMenu = useCallback(
    (event: MouseEvent<SVGElement>) => {
      event.preventDefault();
      setState((state) =>
        !state
          ? {
              position: { left: event.clientX + 2, top: event.clientY - 6 },
              elementId,
            }
          : undefined,
      );
    },
    [elementId],
  );

  const handleClickBringForward = useCallback(() => {
    if (activeElementIds.length === 1) {
      slideInstance.moveElementUp(activeElementIds[0]);
      handleClose();
    }
  }, [activeElementIds, handleClose, slideInstance]);

  const handleClickBringBackward = useCallback(() => {
    if (activeElementIds.length === 1) {
      slideInstance.moveElementDown(activeElementIds[0]);
      handleClose();
    }
  }, [activeElementIds, handleClose, slideInstance]);

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
        open={open && !isLocked}
        onClose={handleClose}
        anchorReference="anchorPosition"
        anchorPosition={state?.position}
      >
        {activeElementIds.length < 2 && (
          <MenuItem onClick={handleClickBringForward} disabled={!canMoveUp}>
            <ListItemText>
              {t('elementContextMenu.bringForward', 'Bring forward')}
            </ListItemText>
            <Typography variant="body2" color="text.secondary">
              <HotkeysHelp keys={isMacOS() ? 'meta+arrowup' : 'ctrl+arrowup'} />
            </Typography>
          </MenuItem>
        )}
        {activeElementIds.length < 2 && (
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
        )}
        <MenuItem onClick={handleClickBringToFront} disabled={!canMoveTop}>
          <ListItemText>
            {t('elementContextMenu.bringToFront', 'Bring to front')}
          </ListItemText>
        </MenuItem>
        <MenuItem
          divider
          onClick={handleClickBringToBack}
          disabled={!canMoveBottom}
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
