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

import { Box, styled } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ToolbarSubMenu, ToolbarSubMenuProps } from './ToolbarSubMenu';

export type ToolbarAvatarMoreButtonProps = {
  count: number;
} & ToolbarSubMenuProps;

const StyledToolbarSubMenu = styled(ToolbarSubMenu)(({ theme }) => ({
  borderRadius: '50%',
  backgroundColor: theme.palette.background.default,
  padding: 0,

  '&:hover': {
    backgroundColor: theme.palette.background.default,
  },

  '&:active': {
    backgroundColor: theme.palette.primary.main,
  },
}));

export function ToolbarAvatarMoreButton({
  count,
  ...props
}: ToolbarAvatarMoreButtonProps) {
  const { t } = useTranslation();

  if (!count) {
    return <></>;
  }

  return (
    <StyledToolbarSubMenu {...props}>
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        borderRadius="50%"
        border={(theme) => `2px solid ${theme.palette.divider}`}
        fontSize={11}
        fontWeight={600}
        width={28}
        height={28}
      >
        {t('toolbar.toolbarAvatar.more', '+{{furtherCount}}', {
          furtherCount: count,
        })}
      </Box>
    </StyledToolbarSubMenu>
  );
}
