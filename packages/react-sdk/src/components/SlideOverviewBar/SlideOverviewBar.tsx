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

import { Box, Stack } from '@mui/material';
import { CSSProperties, forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AddSlideButton } from './AddSlideButton';
import { SlideList } from './SlideList';

export const SlideOverviewBar = forwardRef<
  HTMLDivElement,
  { style?: CSSProperties }
>(({ style }, ref) => {
  const { t } = useTranslation('neoboard');

  return (
    <Stack
      ref={ref}
      style={style}
      component="nav"
      width={220}
      aria-label={t('slideOverviewBar.title', 'Slide Overview')}
      bgcolor="background.default"
      mr={1}
      borderRadius={1}
      height="100%"
      data-guided-tour-target="slide-overview"
    >
      <Box m={1}>
        <AddSlideButton />
      </Box>

      <Box pt={1} px={1} flex="1" sx={{ overflowY: 'auto' }}>
        <SlideList />
      </Box>
    </Stack>
  );
});
