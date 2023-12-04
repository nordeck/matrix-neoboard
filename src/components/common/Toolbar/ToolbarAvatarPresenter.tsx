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
import { getUserColor } from '../../../lib';
import { ActiveWhiteboardMember } from '../../../state/useActiveWhiteboardMembers';
import { useUserDetails } from '../../../store';
import { CollaboratorAvatarPresenter } from '../CollaboratorAvatarPresenter';
import { ToolbarButton } from './ToolbarButton';

export type ToolbarAvatarPresenterProps = PropsWithChildren<{
  member: ActiveWhiteboardMember;
  title?: string;
}>;

export function ToolbarAvatarPresenter({
  member,
  title,
  children,
}: ToolbarAvatarPresenterProps) {
  const ownUserId = useWidgetApi().widgetParameters.userId;

  if (!ownUserId) {
    throw new Error('Unknown user id');
  }

  const { getUserAvatarUrl, getUserDisplayName } = useUserDetails();
  const displayName = getUserDisplayName(member.userId);
  const avatarUrl = getUserAvatarUrl(member.userId);

  const label =
    member.userId === ownUserId
      ? t(
          'toolbar.toolbarAvatar.labelPresenting',
          '{{displayName}} (You) are presenting',
          {
            displayName,
            context: 'you',
          },
        )
      : t(
          'toolbar.toolbarAvatar.labelPresenter',
          '{{displayName}} is presenting',
          {
            displayName,
          },
        );

  return (
    <ToolbarButton
      aria-label={title ?? label}
      sx={(theme) => ({
        background: theme.palette.background.default,
        borderRadius: '50%',
        padding: '2px',
        marginRight: '15px',
        border: `2px dashed ${getUserColor(member.userId)}`,
        boxSizing: 'border-box',

        '&:hover': {
          background: theme.palette.background.default,
        },
      })}
    >
      <CollaboratorAvatarPresenter
        userId={member.userId}
        displayName={displayName}
        avatarUrl={avatarUrl}
      />
      {children}
    </ToolbarButton>
  );
}
