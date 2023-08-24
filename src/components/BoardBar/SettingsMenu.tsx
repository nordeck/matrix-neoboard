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
import { getLogger } from 'loglevel';
import { MouseEvent, useCallback, useState } from 'react';
import { FileRejection, useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import { isValidWhiteboardExportDocument } from '../../state';
import { useLayoutState } from '../Layout';
import { MenuItemSwitch } from '../common/MenuItemSwitch';
import { ToolbarSubMenu } from '../common/Toolbar';
import { DotsGridIcon } from '../icons/DotsGridIcon';
import { FileExportOutlineIcon } from '../icons/FileExportOutlineIcon';
import { FileImportOutlineIcon } from '../icons/FileImportOutlineIcon';
import { ExportWhiteboardDialog } from './ExportWhiteboardDialog';
import { ImportWhiteboardDialog } from './ImportWhiteboardDialog';
import { ImportedWhiteboard } from './types';

export function SettingsMenu() {
  const { t } = useTranslation();
  const {
    setDeveloperToolsVisible,
    isDeveloperToolsVisible,
    isShowGrid,
    setShowGrid,
  } = useLayoutState();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const [openExportDialog, setOpenExportDialog] = useState(false);

  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [importedWhiteboard, setImportedWhiteboard] =
    useState<ImportedWhiteboard>();

  const handleClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const onDrop = useCallback(
    ([file]: File[], rejectedFiles: FileRejection[]) => {
      if (file === undefined && rejectedFiles.length > 0) {
        setImportedWhiteboard({
          name: rejectedFiles[0].file.name,
          isError: true,
        });
        setOpenImportDialog(true);
        return;
      }

      const reader = new FileReader();

      const logger = getLogger('SettingsMenu');

      reader.onabort = () => logger.warn('file reading was aborted');
      reader.onerror = () => logger.warn('file reading has failed');
      reader.onload = () => {
        if (typeof reader.result !== 'string') {
          return;
        }

        try {
          const jsonData = JSON.parse(reader.result);

          if (isValidWhiteboardExportDocument(jsonData)) {
            setImportedWhiteboard({
              name: file.name,
              isError: false,
              data: jsonData,
            });
          } else {
            setImportedWhiteboard({
              name: file.name,
              isError: true,
            });
          }

          setOpenImportDialog(true);
        } catch (ex) {
          const logger = getLogger('SettingsMenu');
          logger.error('Error while parsing the selected import file', ex);

          setImportedWhiteboard({
            name: file.name,
            isError: true,
          });
          setOpenImportDialog(true);
        }
      };

      reader.readAsText(file);
    },
    [],
  );

  const {
    getInputProps,
    getRootProps,
    open: openFilePicker,
  } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: { '': ['.nwb'] },
    noDrag: true,
    multiple: false,
    // the keyboard interactions are already provided by the MenuItems
    noKeyboard: true,
  });
  const filePickerInput = (
    <input {...getInputProps()} data-testid="import-file-picker" />
  );

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
    handleClose();
  }, [handleClose]);

  const handleDebugChange = useCallback(
    (value: boolean) => {
      setDeveloperToolsVisible(value);
    },
    [setDeveloperToolsVisible],
  );

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

      {filePickerInput}

      <ImportWhiteboardDialog
        open={openImportDialog}
        importedWhiteboard={importedWhiteboard}
        onClose={() => setOpenImportDialog(false)}
        onRetry={() => openFilePicker()}
      />
      <ExportWhiteboardDialog
        open={openExportDialog}
        onClose={() => setOpenExportDialog(false)}
      />

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
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
          'aria-labelledby': buttonId,
          dense: true,
          sx: { minWidth: '212px' },
        }}
        id={menuId}
      >
        <MenuItem {...getRootProps({ onClick: handleClose, role: 'menuitem' })}>
          <ListItemIcon>
            <FileImportOutlineIcon sx={{ color: 'text.primary' }} />
          </ListItemIcon>
          <ListItemText>{t('boardBar.menu.import', 'Import…')}</ListItemText>
        </MenuItem>
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
        <MenuItemSwitch
          checked={isDeveloperToolsVisible}
          title={t('boardBar.menu.developerTools', 'Developer Tools')}
          icon={<BugReportOutlinedIcon />}
          onClick={handleDebugClick}
          onChange={handleDebugChange}
        />
      </Menu>
    </>
  );
}
