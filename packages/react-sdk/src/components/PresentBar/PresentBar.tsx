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

import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import CancelPresentationIcon from '@mui/icons-material/CancelPresentation';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import PresentToAllIcon from '@mui/icons-material/PresentToAll';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useActiveSlide,
  useActiveWhiteboardInstance,
  usePresentationMode,
} from '../../state';
import { usePowerLevels } from '../../store/api/usePowerLevels';
import { Toolbar, ToolbarButton, ToolbarToggle } from '../common/Toolbar';
import { useLayoutState } from '../Layout';

export function PresentBar() {
  const { t } = useTranslation('neoboard');
  const whiteboardInstance = useActiveWhiteboardInstance();
  const { activeSlideId, isFirstSlideActive, isLastSlideActive } =
    useActiveSlide();
  const { isShowGrid, setShowGrid } = useLayoutState();
  const { state, toggleEditMode, togglePresentation } = usePresentationMode();
  const { canStopPresentation } = usePowerLevels();

  const handleToNextSlideClick = useCallback(() => {
    if (activeSlideId) {
      const slideIds = whiteboardInstance.getSlideIds();
      const activeSlideIndex = slideIds.indexOf(activeSlideId);
      whiteboardInstance.setActiveSlideId(slideIds[activeSlideIndex + 1]);
    }
  }, [activeSlideId, whiteboardInstance]);

  const handleToPreviousSlideClick = useCallback(() => {
    if (activeSlideId) {
      const slideIds = whiteboardInstance.getSlideIds();
      const activeSlideIndex = slideIds.indexOf(activeSlideId);
      whiteboardInstance.setActiveSlideId(slideIds[activeSlideIndex - 1]);
    }
  }, [activeSlideId, whiteboardInstance]);

  const isPresenting = state.type === 'presenting';
  const isPresentingInEditMode = isPresenting && state.isEditMode;

  const togglePresentationMode = useCallback(() => {
    const storedGridStatus = localStorage.getItem('showGridState');
    if (!isPresenting) {
      if (isShowGrid) {
        localStorage.setItem('showGridState', 'true');
        setShowGrid(false);
      }
      togglePresentation();
    } else {
      if (storedGridStatus === 'true') {
        setShowGrid(true);
        localStorage.removeItem('showGridState');
      }
      togglePresentation();
    }
  }, [isPresenting, isShowGrid, setShowGrid, togglePresentation]);

  const presentBarTitle = t('presentBar.title', 'Present');
  const buttonTitle =
    state.type === 'presenting'
      ? t('presentBar.endPresentation', 'End presentation')
      : t('presentBar.startPresentation', 'Start presentation');

  const presentToolsBarNextSlide = t('presentToolsBar.nextSlide', 'Next slide');
  const presentToolsBarPreviousSlide = t(
    'presentToolsBar.previousSlide',
    'Previous slide',
  );

  const lockOpenButtonTitle = isPresentingInEditMode
    ? t('presentBar.disableEditing', 'Disable editing')
    : t('presentBar.enableEditing', 'Enable editing');

  const endPresentationTitle = t(
    'presentBar.endPresentation',
    'End presentation',
  );

  return (
    <Toolbar
      aria-label={presentBarTitle}
      sx={{ pointerEvents: 'initial' }}
      orientation="vertical"
    >
      {state.type === 'presentation' && canStopPresentation && (
        <ToolbarButton
          aria-label={endPresentationTitle}
          onClick={togglePresentationMode}
          placement="bottom"
        >
          <CancelPresentationIcon color="error" />
        </ToolbarButton>
      )}
      {state.type !== 'presentation' && (
        <ToolbarToggle
          inputProps={{ 'aria-label': buttonTitle }}
          checked={state.type === 'presenting'}
          onClick={togglePresentationMode}
          icon={<PresentToAllIcon />}
          checkedIcon={<PresentToAllIcon />}
          placement={isPresenting ? 'left' : 'bottom'}
        />
      )}
      {state.type === 'presenting' && (
        <>
          <ToolbarButton
            aria-label={presentToolsBarPreviousSlide}
            disabled={isFirstSlideActive}
            onClick={handleToPreviousSlideClick}
            placement="left"
          >
            <ArrowBackIosNewIcon />
          </ToolbarButton>
          <ToolbarButton
            aria-label={presentToolsBarNextSlide}
            disabled={isLastSlideActive}
            onClick={handleToNextSlideClick}
            placement="left"
          >
            <ArrowForwardIosIcon />
          </ToolbarButton>
          <ToolbarToggle
            inputProps={{ 'aria-label': lockOpenButtonTitle }}
            checked={isPresentingInEditMode}
            onClick={toggleEditMode}
            icon={<LockOpenIcon />}
            checkedIcon={<LockOpenIcon />}
            placement="left"
          />
        </>
      )}
    </Toolbar>
  );
}
