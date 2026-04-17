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
import { isInfiniteCanvasMode } from '../../lib';
import {
  findNearestFrameElement,
  useActiveSlideOrFrame,
  useActiveWhiteboardInstance,
  usePresentationMode,
  useWhiteboardSlideOrFrameIds,
} from '../../state';
import { usePowerLevels } from '../../store/api/usePowerLevels';
import { Toolbar, ToolbarButton, ToolbarToggle } from '../common/Toolbar';
import { useLayoutState } from '../Layout';
import { useSvgScaleContext } from '../Whiteboard';

export function PresentBar() {
  const { t } = useTranslation('neoboard');
  const whiteboardInstance = useActiveWhiteboardInstance();
  const { activeId, isFirstActive, isLastActive } = useActiveSlideOrFrame();
  const { isShowGrid, setShowGrid } = useLayoutState();
  const { state, toggleEditMode, togglePresentation } = usePresentationMode();
  const { canStopPresentation } = usePowerLevels();
  const { viewportCanvasCenter } = useSvgScaleContext();
  const slideOrFrameIds = useWhiteboardSlideOrFrameIds();

  const handleToNextSlideClick = useCallback(() => {
    if (activeId) {
      const activeIndex = slideOrFrameIds.indexOf(activeId);
      const newActive = slideOrFrameIds[activeIndex + 1];
      if (isInfiniteCanvasMode()) {
        whiteboardInstance.setActiveFrameElementId(newActive);
      } else {
        whiteboardInstance.setActiveSlideId(newActive);
      }
    }
  }, [activeId, slideOrFrameIds, whiteboardInstance]);

  const handleToPreviousSlideClick = useCallback(() => {
    if (activeId) {
      const activeIndex = slideOrFrameIds.indexOf(activeId);
      const newActive = slideOrFrameIds[activeIndex - 1];
      if (isInfiniteCanvasMode()) {
        whiteboardInstance.setActiveFrameElementId(newActive);
      } else {
        whiteboardInstance.setActiveSlideId(newActive);
      }
    }
  }, [activeId, slideOrFrameIds, whiteboardInstance]);

  const isPresenting = state.type === 'presenting';
  const isPresentingInEditMode = isPresenting && state.isEditMode;

  const togglePresentationMode = useCallback(() => {
    const storedGridStatus = localStorage.getItem('showGridState');
    if (!isPresenting) {
      localStorage.setItem('showGridState', isShowGrid ? 'true' : 'false');
      setShowGrid(false);
    } else {
      setShowGrid(storedGridStatus === 'true');
    }

    const activeSlide = whiteboardInstance.getActiveSlide();
    const frameElementId =
      isInfiniteCanvasMode() && activeSlide
        ? findNearestFrameElement(
            activeSlide.getFrameElements(),
            viewportCanvasCenter,
          )
        : undefined;

    togglePresentation(frameElementId);
  }, [
    isPresenting,
    isShowGrid,
    setShowGrid,
    togglePresentation,
    whiteboardInstance,
    viewportCanvasCenter,
  ]);

  const presentBarTitle = t('presentBar.title', 'Present');
  const buttonTitle =
    isInfiniteCanvasMode() && slideOrFrameIds.length === 0
      ? t(
          'presentBar.addFrameToEnablePresentationMode',
          'Add a frame to enable presentation mode',
        )
      : state.type === 'presenting'
        ? t('presentBar.endPresentation', 'End presentation')
        : t('presentBar.startPresentation', 'Start presentation');

  const presentToolsBarNextSlide = isInfiniteCanvasMode()
    ? t('presentToolsBar.nextFrame', 'Next frame')
    : t('presentToolsBar.nextSlide', 'Next slide');
  const presentToolsBarPreviousSlide = isInfiniteCanvasMode()
    ? t('presentToolsBar.previousFrame', 'Previous frame')
    : t('presentToolsBar.previousSlide', 'Previous slide');

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
          disabled={isInfiniteCanvasMode() && slideOrFrameIds.length === 0}
        />
      )}
      {state.type === 'presenting' && (
        <>
          <ToolbarButton
            aria-label={presentToolsBarPreviousSlide}
            disabled={isFirstActive || activeId === undefined}
            onClick={handleToPreviousSlideClick}
            placement="left"
          >
            <ArrowBackIosNewIcon />
          </ToolbarButton>
          <ToolbarButton
            aria-label={presentToolsBarNextSlide}
            disabled={isLastActive || activeId === undefined}
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
