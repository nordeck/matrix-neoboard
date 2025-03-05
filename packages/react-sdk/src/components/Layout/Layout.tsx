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

import { TabPanel } from '@mui/base';
import { Box, Collapse, Slide, Stack, styled } from '@mui/material';
import { ReactElement, useCallback } from 'react';
import { useMeasure } from '../../lib';
import {
  SlideProvider,
  useActiveWhiteboardInstanceSlideIds,
  useIsWhiteboardLoading,
  usePresentationMode,
} from '../../state';
import { usePowerLevels } from '../../store/api/usePowerLevels';
import { BoardBar } from '../BoardBar';
import { CollaborationBar } from '../CollaborationBar';
import { ConnectionPointProvider } from '../ConnectionPointProvider';
import { DeveloperToolsDialog } from '../DeveloperTools';
import { ElementOverridesProvider } from '../ElementOverridesProvider';
import { FullscreenModeBar } from '../FullscreenModeBar';
import { GuidedTour } from '../GuidedTour';
import { HelpCenterBar } from '../HelpCenterBar';
import { ImageUploadProvider, useSlideImageDropUpload } from '../ImageUpload';
import { ImportWhiteboardDialogProvider } from '../ImportWhiteboardDialog/ImportWhiteboardDialogProvider';
import { PresentBar } from '../PresentBar';
import { Shortcuts } from '../Shortcuts';
import { SlideOverviewBar } from '../SlideOverviewBar';
import { ToolsBar } from '../ToolsBar';
import { UndoRedoBar } from '../UndoRedoBar';
import { WhiteboardHost } from '../Whiteboard';
import { SvgScaleContextProvider } from '../Whiteboard/SvgScaleContext';
import { infiniteCanvasMode } from '../Whiteboard/constants';
import { ZoomBar } from '../ZoomBar';
import { PageLoader } from '../common/PageLoader';
import { SlidesProvider } from './SlidesProvider';
import { ToolbarCanvasContainer } from './ToolbarCanvasContainer';
import { ToolbarContainer } from './ToolbarContainer';
import { useLayoutState } from './useLayoutState';

const TabPanelStyled = styled(TabPanel)(() => ({
  display: 'flex',
  flex: 1,
  flexDirection: 'column',

  '&.base-TabPanel-hidden': {
    display: 'none',
  },
}));

export type LayoutProps = {
  // Height of component, default to '100vh'
  height?: number | string;
};

export function Layout({ height = '100vh' }: LayoutProps) {
  const { loading } = useIsWhiteboardLoading();
  const {
    isDeveloperToolsVisible,
    setDeveloperToolsVisible,
    isFullscreenMode,
    isSlideOverviewVisible,
  } = useLayoutState();
  const slideIds = useActiveWhiteboardInstanceSlideIds();
  const { state: presentationState } = usePresentationMode();
  const isViewingPresentation = presentationState.type === 'presentation';

  const { handleUploadDragEnter, uploadDragOverlay } =
    useSlideImageDropUpload();

  const handleClose = useCallback(() => {
    setDeveloperToolsVisible(false);
  }, [setDeveloperToolsVisible]);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <SlidesProvider>
      <ImageUploadProvider>
        <ImportWhiteboardDialogProvider>
          <GuidedTour disabled={isViewingPresentation} />

          <Stack
            height={!isFullscreenMode ? height : '100vh'}
            direction="row"
            bgcolor="background.paper"
            {...(infiniteCanvasMode
              ? {
                  zIndex: '100',
                  position: 'absolute',
                }
              : {})}
          >
            <AnimatedSidebar
              visible={isSlideOverviewVisible && !isViewingPresentation}
              direction="right"
            >
              <SlideOverviewBar />
            </AnimatedSidebar>

            <Box
              component="main"
              flex={1}
              display="flex"
              position="relative"
              onDragEnter={handleUploadDragEnter}
              sx={{ minWidth: 0 }}
            >
              {slideIds.map((slideId) => (
                <TabPanelStyled
                  value={slideId}
                  key={slideId}
                  sx={{ minWidth: 0 }}
                >
                  <SlideProvider slideId={slideId}>
                    <ElementOverridesProvider>
                      <ConnectionPointProvider>
                        <ContentArea />
                        {uploadDragOverlay}
                      </ConnectionPointProvider>
                    </ElementOverridesProvider>
                  </SlideProvider>
                </TabPanelStyled>
              ))}
            </Box>
            <DeveloperToolsDialog
              open={isDeveloperToolsVisible}
              handleClose={handleClose}
            />
          </Stack>
        </ImportWhiteboardDialogProvider>
      </ImageUploadProvider>
    </SlidesProvider>
  );
}

function AnimatedSidebar({
  visible,
  direction,
  children,
}: {
  visible: boolean;
  direction: 'left' | 'right';
  children: ReactElement;
}) {
  return (
    <Collapse orientation="horizontal" in={visible} mountOnEnter unmountOnExit>
      <Slide in={visible} direction={direction}>
        {children}
      </Slide>
    </Collapse>
  );
}

function ContentArea() {
  const { state: presentationState } = usePresentationMode();
  const isViewingPresentation = presentationState.type === 'presentation';
  const isViewingPresentationInEditMode =
    isViewingPresentation && presentationState.isEditMode;
  const { canStopPresentation } = usePowerLevels();
  const [sizeRef, { width: toolbarWidth }] = useMeasure<HTMLDivElement>();

  return (
    <SvgScaleContextProvider>
      <Shortcuts />

      <ToolbarContainer
        alignItems="flex-start"
        justifyContent="end"
        top={(theme) => theme.spacing(1)}
      >
        {!isViewingPresentation && <BoardBar />}
        <CollaborationBar />
        <ToolbarContainer
          direction="column"
          gap={(theme) => theme.spacing(1)}
          position="relative"
          left={0}
          right={0}
        >
          <FullscreenModeBar />
          {(!isViewingPresentation || canStopPresentation) && <PresentBar />}
        </ToolbarContainer>
      </ToolbarContainer>

      <WhiteboardHost />

      {(!isViewingPresentation || isViewingPresentationInEditMode) && (
        <ToolbarCanvasContainer ref={sizeRef}>
          <ToolbarContainer
            position="fixed"
            bottom={(theme) => theme.spacing(5)}
            left={(theme) => theme.spacing(4)}
            right={(theme) => theme.spacing(4)}
          >
            {infiniteCanvasMode && <ZoomBar />}

            <Box flex="1" />

            <ToolsBar />
            {toolbarWidth > 515 && <UndoRedoBar />}

            <Box display="flex" justifyContent="flex-end" flex="1">
              {toolbarWidth > 600 && <HelpCenterBar />}
            </Box>
          </ToolbarContainer>
        </ToolbarCanvasContainer>
      )}
    </SvgScaleContextProvider>
  );
}
