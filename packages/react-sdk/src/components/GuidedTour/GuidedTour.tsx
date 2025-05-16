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

import { useTheme } from '@mui/material';
import { Trans, useTranslation } from 'react-i18next';
import { useLayoutState } from '../Layout';
import { infiniteCanvasMode } from '../Whiteboard';
import { StyledJoyride } from './StyledJoyride';

type GuidedTourProps = {
  disabled?: boolean;
};

export function GuidedTour({ disabled }: GuidedTourProps) {
  const { t } = useTranslation('neoboard');
  const theme = useTheme();
  const { setSlideOverviewVisible, isSlideOverviewVisible } = useLayoutState();

  let guidedTourSteps = [
    {
      target: 'body',
      title: t('guidedTour.introduction.title', 'Welcome'),
      content: (
        <Trans i18nKey="guidedTour.introduction.content" ns="neoboard">
          <p>
            Welcome to the NeoBoard. In this introduction, you'll get tips on
            how to use the NeoBoard so you can start designing in no time. Let's
            go!
          </p>
        </Trans>
      ),
      disableBeacon: true,
      placement: 'center' as const,
    },
    {
      target: '[data-guided-tour-target="slide-overview"]',
      title: t('guidedTour.slideOverview.title', 'Slide overview'),
      content: (
        <Trans i18nKey="guidedTour.slideOverview.content" ns="neoboard">
          <p>
            This is where you can find the slides of all participants. Click on
            the button to add a slide. With the right mouse button you can open
            the context menu and delete existing slides, lock them to prevent
            changes or bring all participants here. Hold down the left mouse
            button to change the order of the slides.
          </p>
        </Trans>
      ),
      disableBeacon: true,
      placement: 'right' as const,
      onEnter: () => {
        if (!isSlideOverviewVisible) {
          setSlideOverviewVisible(true);
          return { delay: theme.transitions.duration.standard * 1.5 };
        }
      },
      onLeave: () => {
        setSlideOverviewVisible(false);
        return { delay: theme.transitions.duration.standard * 1.5 };
      },
    },
    {
      target: '[data-guided-tour-target="settings"]',
      title: t('guidedTour.settings.title', 'Settings'),
      content: (
        <Trans i18nKey="guidedTour.settings.content" ns="neoboard">
          <p>
            Using the settings, you can export the NeoBoard and the work done
            and import it again (e.g. in another room) or save it as a backup.
            You can also (de)activate the grid.
          </p>
        </Trans>
      ),
      disableBeacon: true,
    },
    {
      target: '[data-guided-tour-target="toolsbar"]',
      title: t('guidedTour.toolsbar.title', 'Tools'),
      content: (
        <Trans i18nKey="guidedTour.toolsbar.content" ns="neoboard">
          <p>
            The toolbar contains all the tools and objects available for
            designing your slide. Select an object and move the mouse anywhere
            on the slide to place it. Draw shapes by moving the mouse while
            holding down the left mouse button. You can place text in the same
            way and start typing right away.
          </p>
        </Trans>
      ),
      disableBeacon: true,
      placement: 'top' as const,
    },
    {
      target: '[data-guided-tour-target="collaborationbar"]',
      title: t('guidedTour.collaborationBar.title', 'Collaboration'),
      content: (
        <Trans i18nKey="guidedTour.collaborationBar.content" ns="neoboard">
          <p>
            To see who is currently active on the NeoBoard, just look here. You
            will see all participants who are currently online or have been
            online recently. And in case it gets crowded, click on the number to
            the right of the first five participants to see who else is online.
            With the small eye you can show or hide the cursors of the others.
          </p>
        </Trans>
      ),
      disableBeacon: true,
    },
    {
      target: '[data-guided-tour-target="helpcenterbar"]',
      title: t('guidedTour.helpCenter.title', 'Help center'),
      content: (
        <Trans i18nKey="guidedTour.helpCenter.content" ns="neoboard">
          <p>
            The help center offers easy access to the user guide and an overview
            of all keyboard shortcuts. You can also restart this tour at any
            time so you can explore everything in more detail.
          </p>
          <p>Have fun, creative ideas and success with the NeoBoard!</p>
        </Trans>
      ),
      placement: 'top' as const,
      disableBeacon: true,
    },
  ];

  if (infiniteCanvasMode) {
    // remove the slide overview step in infinite canvas mode
    guidedTourSteps = guidedTourSteps.filter(
      (step) => step.target !== '[data-guided-tour-target="slide-overview"]',
    );
  }

  return <StyledJoyride disabled={disabled} steps={guidedTourSteps} />;
}
