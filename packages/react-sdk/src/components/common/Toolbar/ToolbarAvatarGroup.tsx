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

import { Stack } from '@mui/material';
import React, { PropsWithChildren, ReactElement } from 'react';

export type ToolbarAvatarGroupProps = PropsWithChildren<{
  maxAvatars: number;
  moreButton: ReactElement;
  label: string;
}>;

export function ToolbarAvatarGroup({
  children,
  maxAvatars,
  moreButton,
  label,
}: ToolbarAvatarGroupProps) {
  const showMoreButton = React.Children.count(children) > maxAvatars;
  const processedChildren = React.Children.toArray(children).slice(
    0,
    maxAvatars,
  );

  return (
    <Stack
      direction="row"
      alignItems="center"
      px="1px"
      sx={{
        '> *:not(:first-of-type)': {
          marginLeft: -1,
        },
        '> *:hover, .Mui-focusVisible': {
          zIndex: 999,
        },
      }}
      role="group"
      aria-label={label}
    >
      {processedChildren}
      {showMoreButton && moreButton}
    </Stack>
  );
}
