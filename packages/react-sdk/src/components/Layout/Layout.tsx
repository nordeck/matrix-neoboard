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
import { ReactElement } from 'react';
import {
  SlideProvider,
  useActiveWhiteboardInstanceSlideIds,
  useIsWhiteboardLoading,
  usePresentationMode,
} from '../../state';
import { usePowerLevels } from '../../store/api/usePowerLevels';
import { BoardBar } from '../BoardBar';
import { CollaborationBar } from '../CollaborationBar';
import { DeveloperTools } from '../DeveloperTools/DeveloperTools';
import { ElementOverridesProvider } from '../ElementOverridesProvider';
import { FullscreenModeBar } from '../FullscreenModeBar';
import { GuidedTour } from '../GuidedTour';
import { HelpCenterBar } from '../HelpCenterBar';
import { ImageUploadProvider } from '../ImageUpload';
import { PresentBar } from '../PresentBar';
import { Shortcuts } from '../Shortcuts';
import { SlideOverviewBar } from '../SlideOverviewBar';
import { ToolsBar } from '../ToolsBar';
import { UndoRedoBar } from '../UndoRedoBar';
import { WhiteboardHost } from '../Whiteboard';
import { PageLoader } from '../common/PageLoader';
import { SlidesProvider } from './SlidesProvider';
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
  const { isDeveloperToolsVisible, isSlideOverviewVisible } = useLayoutState();
  const slideIds = useActiveWhiteboardInstanceSlideIds();
  const { state: presentationState } = usePresentationMode();
  const isViewingPresentation = presentationState.type === 'presentation';

  if (loading) {
    return <PageLoader />;
  }

  return (
    <SlidesProvider>
      <GuidedTour disabled={isViewingPresentation} />

      <Stack height={height} direction="row" bgcolor="background.paper">
        <AnimatedSidebar
          visible={isSlideOverviewVisible && !isViewingPresentation}
          direction="right"
        >
          <SlideOverviewBar />
        </AnimatedSidebar>

        <Box component="main" flex={1} display="flex" position="relative">
          {slideIds.map((slideId) => (
            <TabPanelStyled value={slideId} key={slideId}>
              <SlideProvider slideId={slideId}>
                <ElementOverridesProvider>
                  <ImageUploadProvider>
                    <ContentArea />
                  </ImageUploadProvider>
                </ElementOverridesProvider>
              </SlideProvider>
            </TabPanelStyled>
          ))}
        </Box>

        <AnimatedSidebar visible={isDeveloperToolsVisible} direction="left">
          <DeveloperTools />
        </AnimatedSidebar>
      </Stack>
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

  return (
    <>
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
        <ToolbarContainer bottom={(theme) => theme.spacing(1)}>
          <Box flex="1" />

          <ToolsBar />
          <UndoRedoBar />

          <Box display="flex" justifyContent="flex-end" flex="1">
            <HelpCenterBar />
          </Box>
        </ToolbarContainer>
      )}
    </>
  );
}
