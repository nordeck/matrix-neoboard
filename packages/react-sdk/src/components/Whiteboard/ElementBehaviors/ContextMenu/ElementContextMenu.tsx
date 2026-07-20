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
import first from 'lodash/first';
import last from 'lodash/last';
import {
  MouseEvent,
  PointerEvent,
  PropsWithChildren,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  isPositionEqual,
  Point,
  useSlideElementIds,
  useSlideIsLocked,
  useWhiteboardSlideInstance,
} from '../../../../state';
import { HotkeysHelp } from '../../../common/HotkeysHelp';
import { isMacOS } from '../../../common/platform';
import { useLayoutState } from '../../../Layout';

type ContextMenuState = { position: PopoverPosition } | undefined;

export function ElementContextMenu({
  children,
  elementId,
  activeElementIds = [],
}: PropsWithChildren<{ elementId: string; activeElementIds: string[] }>) {
  const slideInstance = useWhiteboardSlideInstance();
  const positionRef = useRef<Point>();
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const { isTouchScaling } = useLayoutState();

  const [state, setState] = useState<ContextMenuState>();

  useEffect(() => {
    if (!isTouchScaling) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, [isTouchScaling]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleContextMenu = useCallback((event: MouseEvent<SVGElement>) => {
    event.preventDefault();
  }, []);

  const openContextMenu = useCallback((clientX: number, clientY: number) => {
    setState((state) =>
      !state
        ? {
            position: {
              left: clientX + 2,
              top: clientY - 6,
            },
          }
        : undefined,
    );
  }, []);

  const handlePointerDown = useCallback(
    (event: PointerEvent<SVGGElement>) => {
      if (event.pointerType === 'touch') {
        if (isTouchScaling) return;

        positionRef.current = {
          x: event.clientX,
          y: event.clientY,
        };

        const { clientX, clientY } = event;

        timeoutRef.current = setTimeout(() => {
          slideInstance.setActiveElementId(elementId);
          openContextMenu(clientX, clientY);
        }, 500);
        return;
      }

      if (event.button !== 2) {
        return;
      }

      positionRef.current = {
        x: event.clientX,
        y: event.clientY,
      };
    },
    [openContextMenu, slideInstance, elementId, isTouchScaling],
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent<SVGGElement>) => {
      if (event.pointerType === 'touch') {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        return;
      }

      if (!positionRef.current) {
        return;
      }

      const { clientX, clientY } = event;
      if (
        isPositionEqual(positionRef.current, {
          x: clientX,
          y: clientY,
        })
      ) {
        openContextMenu(clientX, clientY);
      }

      positionRef.current = undefined;
    },
    [openContextMenu],
  );

  const handlePointerMove = useCallback((event: PointerEvent<SVGGElement>) => {
    if (event.pointerType === 'touch') {
      event.preventDefault();

      if (!positionRef.current) {
        return;
      }

      const threshold = 2;
      if (
        Math.abs(positionRef.current.x - event.clientX) < threshold &&
        Math.abs(positionRef.current.y - event.clientY) < threshold
      ) {
        return;
      }

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setState(undefined);
    }
  }, []);

  const handleClose = useCallback(() => {
    setState(undefined);
  }, []);

  return (
    <>
      <Box
        component="g"
        onContextMenu={handleContextMenu} // prevents context menu if context menu is fired before mouse up
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
        data-testid="element-context-menu-container"
      >
        {children}
      </Box>

      {state !== undefined && (
        <ContextMenuOptions
          state={state}
          activeElementIds={activeElementIds}
          onClose={handleClose}
        />
      )}
    </>
  );
}

type ContextMenuOptionsProps = PropsWithChildren<{
  state: ContextMenuState;
  activeElementIds: string[];
  onClose: () => void;
}>;

function ContextMenuOptions({
  state,
  activeElementIds,
  onClose,
}: ContextMenuOptionsProps) {
  const isLocked = useSlideIsLocked();
  const slideInstance = useWhiteboardSlideInstance();
  const elementIds = useSlideElementIds();
  const { t } = useTranslation('neoboard');
  const menuTitle = t('elementContextMenu.title', 'Element');
  const [open, setOpen] = useState(true);

  const canMoveUp =
    activeElementIds.length === 1 && last(elementIds) !== activeElementIds[0];
  const canMoveTop = canMoveUp || activeElementIds.length > 1;
  const canMoveDown =
    activeElementIds.length === 1 && first(elementIds) !== activeElementIds[0];
  const canMoveBottom = canMoveDown || activeElementIds.length > 1;

  const handleContextMenu = useCallback((event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    onClose();
  }, [onClose]);

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
    if (activeElementIds.length) {
      slideInstance.removeElements(activeElementIds);
      handleClose();
    }
  }, [activeElementIds, handleClose, slideInstance]);

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

  return (
    <Menu
      slotProps={{
        list: {
          'aria-label': menuTitle,
          dense: true,
          sx: { minWidth: '242px' },
        },
      }}
      open={open && !isLocked}
      onClose={handleClose}
      anchorReference="anchorPosition"
      anchorPosition={state?.position}
      onContextMenu={handleContextMenu} // prevents context menu if context menu is fired after mouse up
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
        <Typography variant="body2" color="text.secondary">
          <HotkeysHelp
            keys={isMacOS() ? 'meta+shift+arrowup' : 'ctrl+shift+arrowup'}
          />
        </Typography>
      </MenuItem>
      <MenuItem
        divider
        onClick={handleClickBringToBack}
        disabled={!canMoveBottom}
      >
        <ListItemText>
          {t('elementContextMenu.bringToBack', 'Bring to back')}
        </ListItemText>
        <Typography variant="body2" color="text.secondary">
          <HotkeysHelp
            keys={isMacOS() ? 'meta+shift+arrowdown' : 'ctrl+shift+arrowdown'}
          />
        </Typography>
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
  );
}
