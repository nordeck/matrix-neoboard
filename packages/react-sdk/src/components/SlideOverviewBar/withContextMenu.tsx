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

import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import {
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  PopoverPosition,
} from '@mui/material';
import React, { MouseEvent, Ref, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useActiveWhiteboardInstance,
  useActiveWhiteboardInstanceSlideIds,
  useSlideIsLocked,
} from '../../state';
import { MenuItemSwitch } from '../common/MenuItemSwitch';

type ContextMenuState =
  | { slideId: string; position: PopoverPosition }
  | undefined;

type WithContextMenuProps = {
  slideId: string;
  slideIndex: number;
  innerRef: Ref<HTMLElement>;
};

export const withContextMenu = <P extends object>(
  Component: React.ComponentType<P>,
): React.FC<P & WithContextMenuProps> => {
  return ({
    slideId,
    slideIndex,
    innerRef,
    ...props
  }: WithContextMenuProps) => {
    const { t } = useTranslation();
    const [state, setState] = useState<ContextMenuState>();
    const whiteboardInstance = useActiveWhiteboardInstance();
    const slideIds = useActiveWhiteboardInstanceSlideIds();
    const isLocked = useSlideIsLocked(slideId);
    const canDelete = slideIds.length > 1 && !isLocked;
    const canDuplicate = !isLocked;

    const handleClose = useCallback(() => {
      setState(undefined);
    }, []);

    const handleClickBringEveryoneToSlide = useCallback(() => {
      whiteboardInstance.focusOn(slideId);
      handleClose();
    }, [handleClose, slideId, whiteboardInstance]);

    const handleLockClick = useCallback(() => {
      handleClose();
    }, [handleClose]);

    const handleLockChange = useCallback(
      (value: boolean) => {
        if (value) {
          whiteboardInstance.getSlide(slideId).lockSlide();
        } else {
          whiteboardInstance.getSlide(slideId).unlockSlide();
        }
      },
      [slideId, whiteboardInstance],
    );

    const handleDelete = useCallback(() => {
      if (state) {
        handleClose();
        whiteboardInstance.removeSlide(state.slideId);
      }
    }, [state, handleClose, whiteboardInstance]);

    const handleDuplicateSlide = useCallback(() => {
      const newSlideId = whiteboardInstance.duplicateSlide(slideId);
      whiteboardInstance.setActiveSlideId(newSlideId);
      handleClose();
    }, [handleClose, slideId, whiteboardInstance]);

    const handleInsertSlide = useCallback(() => {
      const newSlideId = whiteboardInstance.addSlide(slideIndex + 1);
      whiteboardInstance.setActiveSlideId(newSlideId);
      handleClose();
    }, [handleClose, slideIndex, whiteboardInstance]);

    const handleContextMenu = useCallback(
      (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        setState((state) =>
          !state
            ? {
                position: { left: event.clientX + 2, top: event.clientY - 6 },
                slideId,
              }
            : undefined,
        );
      },
      [slideId],
    );

    const menuTitle = t(
      'slideOverviewBar.contextMenu.title',
      'Slide {{index}}',
      { index: slideIndex + 1 },
    );
    const open = Boolean(state);
    return (
      <>
        <Component
          {...(props as P)}
          ref={innerRef}
          onContextMenu={handleContextMenu}
        />

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
          open={open}
          onClose={handleClose}
          anchorReference="anchorPosition"
          anchorPosition={state?.position}
        >
          <MenuItemSwitch
            checked={isLocked}
            title={t('slideOverviewBar.contextMenu.lockSlide', 'Lock')}
            icon={<LockOutlinedIcon />}
            onClick={handleLockClick}
            onChange={handleLockChange}
          />
          <MenuItem disabled={!canDuplicate} onClick={handleDuplicateSlide}>
            <ListItemIcon sx={{ color: 'text.primary' }}>
              <ContentCopyIcon />
            </ListItemIcon>
            <ListItemText>
              {t(
                'slideOverviewBar.contextMenu.duplicateSlide',
                'Duplicate slide',
              )}
            </ListItemText>
          </MenuItem>
          <MenuItem onClick={handleInsertSlide}>
            <ListItemIcon sx={{ color: 'text.primary' }}>
              <AddIcon />
            </ListItemIcon>
            <ListItemText>
              {t('slideOverviewBar.contextMenu.insertSlide', 'Insert slide')}
            </ListItemText>
          </MenuItem>
          <MenuItem divider onClick={handleClickBringEveryoneToSlide}>
            <ListItemIcon sx={{ color: 'text.primary' }}>
              <PeopleAltOutlinedIcon />
            </ListItemIcon>
            <ListItemText>
              {t(
                'slideOverviewBar.contextMenu.bringEveryoneToSlide',
                'Bring all here',
              )}
            </ListItemText>
          </MenuItem>
          <MenuItem
            onClick={handleDelete}
            disabled={!canDelete}
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon sx={{ color: 'error.main' }}>
              <DeleteOutlinedIcon />
            </ListItemIcon>
            <ListItemText>
              {t('slideOverviewBar.contextMenu.deleteSlide', 'Delete')}
            </ListItemText>
          </MenuItem>
        </Menu>
      </>
    );
  };
};
