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

import { Grow, styled } from '@mui/material';
import { TransitionGroup } from 'react-transition-group';
import { useActiveCursors } from '../../../state';
import { useUserDetails } from '../../../store';
import { Cursor } from './Cursor';

const NoInteraction = styled('g')({
  pointerEvents: 'none',
});

export function CursorRenderer() {
  const activeCursors = useActiveCursors();
  const { getUserDisplayName } = useUserDetails();

  return (
    <NoInteraction>
      <TransitionGroup component={null}>
        {Object.entries(activeCursors).map(([userId, position]) => {
          if (!position) {
            return null;
          }

          const displayName = getUserDisplayName(userId);

          return (
            <Grow timeout={200} key={userId}>
              <Cursor
                userId={userId}
                position={position}
                displayName={displayName}
              />
            </Grow>
          );
        })}
      </TransitionGroup>
    </NoInteraction>
  );
}
