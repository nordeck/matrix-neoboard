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

import { useWidgetApi } from '@matrix-widget-toolkit/react';
import {
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  MenuItemProps,
} from '@mui/material';
import { unstable_useId as useId } from '@mui/utils';
import { MouseEvent, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActiveWhiteboardMember,
  useActiveWhiteboardMembers,
} from '../../../state';
import { useUserDetails } from '../../../store';
import { CollaboratorAvatar } from '../../common/CollaboratorAvatar';
import { ellipsis } from '../../common/ellipsis';
import {
  ToolbarAvatar,
  ToolbarAvatarGroup,
  ToolbarAvatarMoreButton,
} from '../../common/Toolbar';
import { orderMembersByState } from './orderMembersByState';

export function Collaborators() {
  const { t } = useTranslation();
  const ownUserId = useWidgetApi().widgetParameters.userId;

  if (!ownUserId) {
    throw new Error('Unknown user id');
  }

  const activeMembers = useActiveWhiteboardMembers();
  const orderedMembers = orderMembersByState(activeMembers, ownUserId);
  const maxAvatars = 5;
  const furtherMembers = orderedMembers.slice(maxAvatars);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleMoreButtonClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      setAnchorEl(event.currentTarget);
    },
    []
  );

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const menuTitle = t('collaborationBar.collaborators.menu.title', {
    defaultValue_one: 'One further collaborator',
    defaultValue: '{{count}} further collaborators',
    count: furtherMembers.length,
  });
  const buttonId = useId();
  const menuId = useId();

  return (
    <>
      <ToolbarAvatarGroup
        label={t('collaborationBar.collaborators.title', 'Collaborators')}
        maxAvatars={maxAvatars}
        moreButton={
          <ToolbarAvatarMoreButton
            onClick={handleMoreButtonClick}
            count={furtherMembers.length}
            aria-controls={open ? menuId : undefined}
            aria-expanded={open ? 'true' : undefined}
            aria-haspopup="true"
            id={buttonId}
            aria-label={menuTitle}
          />
        }
      >
        {orderedMembers.map((m) => (
          <ToolbarAvatar key={m.userId} member={m} />
        ))}
      </ToolbarAvatarGroup>

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
          sx: { minWidth: 212 },
        }}
        id={menuId}
      >
        {furtherMembers.map((m) => (
          <CollaboratorMenuItem
            key={m.userId}
            member={m}
            onClick={handleClose}
          />
        ))}
      </Menu>
    </>
  );
}

type CollaboratorMenuItemProps = {
  member: ActiveWhiteboardMember;
} & MenuItemProps;

function CollaboratorMenuItem({ member, ...props }: CollaboratorMenuItemProps) {
  const { getUserAvatarUrl, getUserDisplayName } = useUserDetails();
  const displayName = getUserDisplayName(member.userId);
  const avatarUrl = getUserAvatarUrl(member.userId);

  return (
    // We need to pass props down to a MenuItem if we wrapped it inside a
    // component, otherwise it doesn't set the focus to the menu correctly
    // https://github.com/mui/material-ui/blob/aff4ec6a8d5d4e9526a3b81123fdca4f0ddb666a/packages/mui-material/src/MenuList/MenuList.js#L248-L259
    <MenuItem {...props}>
      <ListItemIcon>
        <CollaboratorAvatar
          userId={member.userId}
          displayName={displayName}
          avatarUrl={avatarUrl}
        />
      </ListItemIcon>
      <ListItemText sx={{ ...ellipsis, position: 'relative' }}>
        {displayName}
      </ListItemText>
    </MenuItem>
  );
}
