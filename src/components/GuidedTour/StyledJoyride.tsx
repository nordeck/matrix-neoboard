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

import { getNonce } from '@matrix-widget-toolkit/mui';
import { useTheme } from '@mui/material';
import { getLogger } from 'loglevel';
import Joyride, { ACTIONS, EVENTS, STATUS, Step } from 'react-joyride';
import { useGuidedTour } from './GuidedTourProvider';
import { StyledJoyrideStep } from './StyledJoyrideStep';

export type ExtendedStep = Step & {
  onEnter?: () => void | { delay: number };
  onLeave?: () => void | { delay: number };
};

export type StyledJoyrideProps = {
  steps: ExtendedStep[];
  disabled?: boolean;
};

export function StyledJoyride({ steps, disabled }: StyledJoyrideProps) {
  const logger = getLogger('GuidedTour');
  const theme = useTheme();
  const {
    isRunning,
    stepIndex,
    goToNextStep,
    goToPreviousStep,
    resumeGuidedTour,
    completeGuidedTour,
  } = useGuidedTour();

  return (
    <Joyride
      // Set a nonce to make it work with our CSP
      nonce={getNonce()}
      run={isRunning && !disabled}
      continuous
      stepIndex={stepIndex}
      steps={steps}
      callback={({ status, action, index, type, controlled }) => {
        if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
          completeGuidedTour();
        }

        if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
          const currentStep = steps[index];

          if (action === ACTIONS.CLOSE) {
            if (currentStep && currentStep.onLeave) {
              currentStep.onLeave();
            }

            completeGuidedTour();
          } else {
            const goTo =
              action === ACTIONS.PREV ? goToPreviousStep : goToNextStep;
            const nextIndex = action === ACTIONS.PREV ? index - 1 : index + 1;
            const nextStep = steps[nextIndex];

            let leaveResult: void | { delay: number };
            let enterResult: void | { delay: number };

            if (currentStep.onLeave && (leaveResult = currentStep.onLeave())) {
              goTo({ pause: true });

              setTimeout(() => {
                if (
                  nextStep &&
                  nextStep.onEnter &&
                  (enterResult = nextStep.onEnter())
                ) {
                  setTimeout(() => {
                    resumeGuidedTour();
                  }, enterResult.delay);
                } else {
                  resumeGuidedTour();
                }
              }, leaveResult.delay);
            } else {
              if (
                nextStep &&
                nextStep.onEnter &&
                (enterResult = nextStep.onEnter())
              ) {
                goTo({ pause: true });

                setTimeout(() => {
                  resumeGuidedTour();
                }, enterResult.delay);
              } else {
                goTo();
              }
            }
          }
        }

        logger.log(
          `Status: ${status}, Action: ${action}, Index: ${index}, Type: ${type}`,
          controlled,
        );
      }}
      spotlightPadding={0}
      tooltipComponent={StyledJoyrideStep}
      floaterProps={{ disableFlip: true }}
      styles={{
        spotlight: {
          mixBlendMode: 'screen',
          borderRadius: theme.shape.borderRadius,
        },
        overlay: {
          backgroundColor:
            // https://github.com/nordeck/matrix-widget-toolkit/blob/101d6cc3b4e1e16e3b0e099078c5464411a7eb3e/packages/mui/src/components/MuiThemeProvider/theme.ts#L223-L225
            theme.palette.mode === 'dark'
              ? 'rgba(0,0,0,.8)'
              : 'rgba(46,48,51,.304)',
        },
        options: {
          // Adjust the z-index of all joyride components to be above our
          // components
          zIndex: theme.zIndex.appBar + 1,

          // Adjust to our theming
          arrowColor: theme.palette.background.paper,
        },
      }}
    />
  );
}
