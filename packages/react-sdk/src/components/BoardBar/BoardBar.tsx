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

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { isInfiniteCanvasMode } from '../../lib';
import { useActiveWhiteboardInstanceSlideOrFrameIds } from '../../state';
import { Toolbar } from '../common/Toolbar';
import { useLayoutState } from '../Layout';
import { SettingsMenu } from './SettingsMenu';
import { ShowSlideOverviewToggle } from './ShowSlideOverviewToggle';

export function BoardBar() {
  const { t } = useTranslation('neoboard');
  const slideOrFrameIds = useActiveWhiteboardInstanceSlideOrFrameIds();
  const { setSlideOverviewVisible, isSlideOverviewVisible } = useLayoutState();

  const toolbarTitle = t('boardBar.title', 'Board');

  useEffect(() => {
    if (
      isInfiniteCanvasMode() &&
      isSlideOverviewVisible &&
      slideOrFrameIds.length === 0
    ) {
      setSlideOverviewVisible(false);
    }
  }, [isSlideOverviewVisible, setSlideOverviewVisible, slideOrFrameIds]);

  return (
    <Toolbar
      aria-label={toolbarTitle}
      sx={{ pointerEvents: 'initial', marginRight: 'auto' }}
      data-guided-tour-target="settings"
    >
      {slideOrFrameIds.length > 0 && <ShowSlideOverviewToggle />}
      <SettingsMenu />
    </Toolbar>
  );
}
