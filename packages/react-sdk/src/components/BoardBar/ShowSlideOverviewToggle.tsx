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

import { TFunction } from 'i18next';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { isInfiniteCanvasMode } from '../../lib';
import { useWhiteboardSlideOrFrameIds } from '../../state';
import { useLayoutState } from '../Layout';
import { ToolbarToggle } from '../common/Toolbar';
import { SidebarLeftIcon } from '../icons/SidebarLeftIcon';

export function ShowSlideOverviewToggle() {
  const { t } = useTranslation('neoboard');
  const { isSlideOverviewVisible, setSlideOverviewVisible } = useLayoutState();
  const slideOrFrameIds = useWhiteboardSlideOrFrameIds();

  const title = getTitle(isSlideOverviewVisible, slideOrFrameIds, t);

  const handleVisibilityChange = useCallback(
    (_: unknown, checked: boolean) => {
      setSlideOverviewVisible(checked);
    },
    [setSlideOverviewVisible],
  );
  return (
    <ToolbarToggle
      inputProps={{
        'aria-label': title,
      }}
      checked={isSlideOverviewVisible}
      icon={<SidebarLeftIcon />}
      checkedIcon={<SidebarLeftIcon />}
      onChange={handleVisibilityChange}
      disabled={isInfiniteCanvasMode() && slideOrFrameIds.length === 0}
    />
  );
}

function getTitle(
  isSlideOverviewVisible: boolean,
  slideOrFrameIds: string[],
  t: TFunction,
): string {
  if (isInfiniteCanvasMode()) {
    if (isSlideOverviewVisible) {
      return t('boardBar.hideFrameBarTitle', 'Close frame overview');
    } else if (slideOrFrameIds.length === 0) {
      return t(
        'boardBar.addFrameToEnableOverview',
        'Add a frame to enable frame overview',
      );
    } else {
      return t('boardBar.showFrameBarTitle', 'Open frame overview');
    }
  } else if (isSlideOverviewVisible) {
    return t('boardBar.hideSlideBarTitle', 'Close slide overview');
  } else {
    return t('boardBar.showSlideBarTitle', 'Open slide overview');
  }
}
