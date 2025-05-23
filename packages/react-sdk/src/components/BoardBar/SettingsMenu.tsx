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

import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined';
import SettingsIcon from '@mui/icons-material/Settings';
import { ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import { unstable_useId as useId } from '@mui/utils';
import { MouseEvent, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePowerLevels } from '../../store/api/usePowerLevels';
import { useImportWhiteboardDialog } from '../ImportWhiteboardDialog/useImportWhiteboardDialog';
import { useLayoutState } from '../Layout';
import { MenuItemSwitch } from '../common/MenuItemSwitch';
import { ToolbarSubMenu } from '../common/Toolbar';
import { DotsGridIcon } from '../icons/DotsGridIcon';
import { FileExportOutlineIcon } from '../icons/FileExportOutlineIcon';
import { FileImportOutlineIcon } from '../icons/FileImportOutlineIcon';
import { ExportWhiteboardDialog } from './ExportWhiteboardDialog';

function ImportMenuItem({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('neoboard');
  const importContext = useImportWhiteboardDialog();
  return (
    <MenuItem
      onClick={useCallback(() => {
        importContext.showImportWhiteboardDialog();
        onClose();
      }, [importContext, onClose])}
    >
      <ListItemIcon>
        <FileImportOutlineIcon sx={{ color: 'text.primary' }} />
      </ListItemIcon>
      <ListItemText>{t('boardBar.menu.import', 'Import…')}</ListItemText>
    </MenuItem>
  );
}

export function SettingsMenu() {
  const { t } = useTranslation('neoboard');
  const { setDeveloperToolsVisible, isShowGrid, setShowGrid } =
    useLayoutState();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const [openExportDialog, setOpenExportDialog] = useState(false);
  const { canImportWhiteboard } = usePowerLevels();

  const handleClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleExportClick = useCallback(() => {
    setOpenExportDialog(true);
    handleClose();
  }, [handleClose]);

  const handleGridClick = useCallback(() => {
    handleClose();
  }, [handleClose]);

  const handleGridChange = useCallback(
    (value: boolean) => {
      setShowGrid(value);
    },
    [setShowGrid],
  );

  const handleDebugClick = useCallback(() => {
    setDeveloperToolsVisible(true);
    handleClose();
  }, [handleClose, setDeveloperToolsVisible]);

  const menuTitle = t('boardBar.menu.title', 'Settings');
  const buttonId = useId();
  const menuId = useId();

  return (
    <>
      <ToolbarSubMenu
        aria-controls={open ? menuId : undefined}
        aria-expanded={open ? 'true' : undefined}
        aria-haspopup="true"
        id={buttonId}
        onClick={handleClick}
        aria-label={menuTitle}
      >
        <SettingsIcon />
      </ToolbarSubMenu>

      <ExportWhiteboardDialog
        open={openExportDialog}
        onClose={useCallback(() => setOpenExportDialog(false), [])}
      />

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        componentsProps={useMemo(
          () => ({
            backdrop: {
              // Make sure to close the context menu if the user clicks on the
              // backdrop
              onContextMenu: (e) => {
                e.preventDefault();
                handleClose();
              },
            },
          }),
          [handleClose],
        )}
        MenuListProps={useMemo(
          () => ({
            'aria-labelledby': buttonId,
            dense: true,
            sx: { minWidth: '212px' },
          }),
          [buttonId],
        )}
        id={menuId}
      >
        {canImportWhiteboard && <ImportMenuItem onClose={handleClose} />}
        <MenuItem onClick={handleExportClick}>
          <ListItemIcon>
            <FileExportOutlineIcon sx={{ color: 'text.primary' }} />
          </ListItemIcon>
          <ListItemText>{t('boardBar.menu.export', 'Export…')}</ListItemText>
        </MenuItem>
        <MenuItemSwitch
          checked={isShowGrid}
          title={t('boardBar.menu.grid', 'Grid')}
          icon={<DotsGridIcon />}
          onClick={handleGridClick}
          onChange={handleGridChange}
        />
        <MenuItem onClick={handleDebugClick}>
          <ListItemIcon>
            <BugReportOutlinedIcon sx={{ color: 'text.primary' }} />
          </ListItemIcon>
          <ListItemText>
            {t('boardBar.menu.developerTools', 'Developer Tools')}
          </ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
