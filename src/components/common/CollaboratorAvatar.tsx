/*
 * Copyright 2022 Nordeck IT + Consulting GmbH
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

import { ElementAvatar } from '@matrix-widget-toolkit/mui';
import { getUserColor } from '../../lib';

export type CollaboratorAvatarProps = {
  /** The id of the user */
  userId: string;
  /** The display name of the user. */
  displayName?: string;
  /** The url of the avatar. */
  avatarUrl?: string;
};

export function CollaboratorAvatar({
  userId,
  displayName,
  avatarUrl,
}: CollaboratorAvatarProps) {
  return (
    <ElementAvatar
      userId={userId}
      displayName={displayName}
      avatarUrl={avatarUrl}
      sx={(theme) => ({
        // We are using a box shadow instead of an outline as it doesn't work
        // together with borderRadius in Safari
        boxShadow: `0 0 0 2px ${getUserColor(userId)}`,
        border: `2px solid ${theme.palette.background.default}`,
      })}
    />
  );
}
