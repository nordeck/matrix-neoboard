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

import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import PresentToAllIcon from '@mui/icons-material/PresentToAll';
import { Box } from '@mui/material';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PresentationState,
  useActiveSlide,
  useActiveWhiteboardInstance,
  useActiveWhiteboardInstanceSlideIds,
  usePresentationMode,
} from '../../state';
import { useUserDetails } from '../../store';
import {
  Toolbar,
  ToolbarAvatar,
  ToolbarButton,
  ToolbarToggle,
} from '../common/Toolbar';

export function PresentBar() {
  const { t } = useTranslation();
  const slideIds = useActiveWhiteboardInstanceSlideIds();
  const whiteboardInstance = useActiveWhiteboardInstance();
  const { activeSlideId, isFirstSlideActive, isLastSlideActive } =
    useActiveSlide();
  const { state, togglePresentation } = usePresentationMode();

  const isViewingPresentation = state.type === 'presenting';

  const handleToNextSlideClick = useCallback(() => {
    if (activeSlideId) {
      const activeSlideIndex = slideIds.indexOf(activeSlideId);
      whiteboardInstance.setActiveSlideId(slideIds[activeSlideIndex + 1]);
    }
  }, [activeSlideId, slideIds, whiteboardInstance]);

  const handleToPreviousSlideClick = useCallback(() => {
    if (activeSlideId) {
      const activeSlideIndex = slideIds.indexOf(activeSlideId);
      whiteboardInstance.setActiveSlideId(slideIds[activeSlideIndex - 1]);
    }
  }, [activeSlideId, slideIds, whiteboardInstance]);

  const presentBarTitle = t('presentBar.title', 'Present');
  const buttonTitle =
    state.type === 'presenting'
      ? t('presentBar.stopPresentation', 'Stop presentation')
      : t('presentBar.startPresentation', 'Start presentation');

  const presentToolsBarNextSlide = t('presentToolsBar.nextSlide', 'Next slide');
  const presentToolsBarPreviousSlide = t(
    'presentToolsBar.previousSlide',
    'Previous slide'
  );

  return (
    <Toolbar
      aria-label={presentBarTitle}
      sx={{ pointerEvents: 'initial' }}
      orientation="vertical"
    >
      {state.type !== 'presentation' && (
        <ToolbarToggle
          inputProps={{ 'aria-label': buttonTitle }}
          checked={state.type === 'presenting'}
          onClick={togglePresentation}
          icon={<PresentToAllIcon />}
          checkedIcon={<PresentToAllIcon />}
        />
      )}
      {isViewingPresentation && (
        <>
          <ToolbarButton
            aria-label={presentToolsBarPreviousSlide}
            disabled={isFirstSlideActive}
            onClick={handleToPreviousSlideClick}
          >
            <ArrowBackIosIcon />
          </ToolbarButton>
          <ToolbarButton
            aria-label={presentToolsBarNextSlide}
            disabled={isLastSlideActive}
            onClick={handleToNextSlideClick}
          >
            <ArrowForwardIosIcon />
          </ToolbarButton>
        </>
      )}

      {state.type === 'presentation' && <PresenterAvatar state={state} />}
    </Toolbar>
  );
}

function PresenterAvatar({
  state,
}: {
  state: Extract<PresentationState, { type: 'presentation' }>;
}) {
  const { t } = useTranslation();

  const { getUserDisplayName } = useUserDetails();
  const displayName = getUserDisplayName(state.presenterUserId);

  const presenterTitle = t(
    'presentBar.isPresentingUser',
    '{{displayName}} is presenting',
    { displayName }
  );

  return (
    <ToolbarAvatar
      title={presenterTitle}
      member={{ userId: state.presenterUserId }}
    >
      <Box component="span" ml={1} fontSize="medium">
        {t('presentBar.isPresenting', 'is presenting')}
      </Box>
    </ToolbarAvatar>
  );
}
