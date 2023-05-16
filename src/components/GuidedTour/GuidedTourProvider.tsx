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

import {
  createContext,
  PropsWithChildren,
  useContext,
  useMemo,
  useState,
} from 'react';
import { getSetting, setSetting } from '../../lib/settings';

function isGuidedTourCompleted(): boolean {
  return getSetting('guided_tour_completed') === true;
}

type GuidedTourContextType = {
  restartGuidedTour(): void;
  completeGuidedTour(): void;
  pauseGuidedTour(): void;
  resumeGuidedTour(): void;
  goToNextStep(options?: { pause?: boolean }): void;
  goToPreviousStep(options?: { pause?: boolean }): void;
  stepIndex: number | undefined;
  isRunning: boolean;
};

const GuidedTourContext = createContext<GuidedTourContextType | undefined>(
  undefined
);

export function useGuidedTour(): GuidedTourContextType {
  const context = useContext(GuidedTourContext);

  if (!context) {
    throw new Error(
      'useGuidedTour can only be used inside a GuidedTourProvider'
    );
  }

  return context;
}

export function GuidedTourProvider({ children }: PropsWithChildren<{}>) {
  const [state, setState] = useState(() => ({
    stepIndex: 0,
    isRunning: !isGuidedTourCompleted(),
  }));

  const context = useMemo(
    () => ({
      ...state,
      restartGuidedTour() {
        setState((s) => ({ ...s, stepIndex: 0, isRunning: true }));
      },
      completeGuidedTour() {
        setState((s) => ({ ...s, isRunning: false }));
        setSetting('guided_tour_completed', true);
      },
      pauseGuidedTour() {
        setState((s) => ({ ...s, isRunning: false }));
      },
      resumeGuidedTour() {
        setState((s) => ({ ...s, isRunning: true }));
      },
      goToNextStep({ pause }: { pause?: boolean } = {}) {
        setState((s) => ({
          ...s,
          isRunning: pause ? false : s.isRunning,
          stepIndex: s.stepIndex + 1,
        }));
      },
      goToPreviousStep({ pause }: { pause?: boolean } = {}) {
        setState((s) => ({
          ...s,
          isRunning: pause ? false : s.isRunning,
          stepIndex: s.stepIndex - 1,
        }));
      },
    }),
    [state]
  );

  return (
    <GuidedTourContext.Provider value={context}>
      {children}
    </GuidedTourContext.Provider>
  );
}
