/*
 * Copyright 2024 Nordeck IT + Consulting GmbH
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

import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import { t } from 'i18next';
import { useCallback } from 'react';
import { useLayoutState } from '../Layout';
import { ToolbarButton } from '../common/Toolbar';

export function ToggleFullscreenModeButton() {
  const { isFullscreenMode: isFullscreen, setFullscreenMode: setFullscreen } =
    useLayoutState();

  const toggleFullscreenMode = useCallback(() => {
    setFullscreen(!isFullscreen);
  }, [isFullscreen, setFullscreen]);

  const fullscreenModeButtonTitle = isFullscreen
    ? t('fullscreenModeBar.fullscreenOff', 'Fullscreen off')
    : t('fullscreenModeBar.fullscreenOn', 'Fullscreen on');

  return (
    <ToolbarButton
      aria-label={fullscreenModeButtonTitle}
      onClick={toggleFullscreenMode}
      placement="bottom"
    >
      {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
    </ToolbarButton>
  );
}
