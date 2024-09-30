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

import { getEnvironment } from '@matrix-widget-toolkit/mui';
import { Link, ListItemText, Menu, MenuItem } from '@mui/material';
import { unstable_useId as useId } from '@mui/utils';
import { MouseEvent, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGuidedTour } from '../GuidedTour';
import { ToolbarSubMenu } from '../common/Toolbar';
import { HelpIcon } from '../icons/HelpIcon';
import { InfoDialog } from './InfoDialog';

export function HelpMenu() {
  const { t } = useTranslation('neoboard');
  const helpCenterUrl = getEnvironment('REACT_APP_HELP_CENTER_URL');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { restartGuidedTour } = useGuidedTour();
  const embedded = getEnvironment('REACT_APP_EMBADDED') === 'true';

  const open = Boolean(anchorEl);

  const handleClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleClickResetOnboarding = useCallback(() => {
    restartGuidedTour();
    handleClose();
  }, [handleClose, restartGuidedTour]);

  const [openAbout, setOpenAbout] = useState(false);

  const handleClickAbout = useCallback(() => {
    setOpenAbout(true);
    handleClose();
  }, [handleClose]);

  const handleCloseAbout = useCallback(() => {
    setOpenAbout(false);
  }, []);

  const menuTitle = t('helpCenter.menu.title', 'Help');
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
        <HelpIcon />
      </ToolbarSubMenu>

      <Menu
        anchorEl={anchorEl}
        open={open}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
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
            sx: { minWidth: 212 },
          }),
          [buttonId],
        )}
        id={menuId}
      >
        {helpCenterUrl && (
          <MenuItem
            onClick={handleClose}
            component={Link}
            href={helpCenterUrl}
            target="_blank"
          >
            <ListItemText>
              {t('helpCenter.menu.helpCenter', 'Help Center')}
            </ListItemText>
          </MenuItem>
        )}

        <MenuItem onClick={handleClickResetOnboarding}>
          <ListItemText>
            {t('helpCenter.menu.resetOnboarding', 'Reset onboarding')}
          </ListItemText>
        </MenuItem>

        {!embedded && (
          <MenuItem onClick={handleClickAbout}>
            <ListItemText>
              {t('helpCenter.menu.about', 'About NeoBoard')}
            </ListItemText>
          </MenuItem>
        )}
      </Menu>

      <InfoDialog open={openAbout} onClose={handleCloseAbout} />
    </>
  );
}
