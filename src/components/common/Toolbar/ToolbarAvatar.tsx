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
import { t } from 'i18next';
import { PropsWithChildren } from 'react';
import { ActiveWhiteboardMember } from '../../../state/useActiveWhiteboardMembers';
import { useUserDetails } from '../../../store';
import { CollaboratorAvatar } from '../CollaboratorAvatar';
import { ToolbarButton } from './ToolbarButton';

export type ToolbarAvatarProps = PropsWithChildren<{
  member: ActiveWhiteboardMember;
  title?: string;
}>;

export function ToolbarAvatar({ member, title, children }: ToolbarAvatarProps) {
  const ownUserId = useWidgetApi().widgetParameters.userId;

  if (!ownUserId) {
    throw new Error('Unknown user id');
  }

  const { getUserAvatarUrl, getUserDisplayName } = useUserDetails();
  const displayName = getUserDisplayName(member.userId);
  const avatarUrl = getUserAvatarUrl(member.userId);

  const label =
    member.userId === ownUserId
      ? t('toolbar.toolbarAvatar.label', '{{displayName}} (You)', {
          displayName,
          context: 'you',
        })
      : displayName;

  return (
    <ToolbarButton
      aria-label={title ?? label}
      sx={(theme) => ({
        background: theme.palette.background.default,
        borderRadius: '50%',
        paddingY: '2px',

        '&:hover': {
          background: theme.palette.background.default,
        },
      })}
    >
      <CollaboratorAvatar
        userId={member.userId}
        displayName={displayName}
        avatarUrl={avatarUrl}
      />
      {children}
    </ToolbarButton>
  );
}
