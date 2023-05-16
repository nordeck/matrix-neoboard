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

import { useMemo } from 'react';
import { useObservable } from 'react-use';
import { PresentationState } from './types';
import { useActiveWhiteboardInstance } from './useActiveWhiteboardInstance';

type UsePresentationMode = {
  state: PresentationState;
  togglePresentation: () => void;
};

export function usePresentationMode(): UsePresentationMode {
  const activeWhiteboardInstance = useActiveWhiteboardInstance();

  const observable = useMemo(
    () =>
      activeWhiteboardInstance
        .getPresentationManager()
        .observePresentationState(),
    [activeWhiteboardInstance]
  );

  const presentationState = useObservable(observable, { type: 'idle' });

  return useMemo<UsePresentationMode>(
    () => ({
      state: presentationState,
      togglePresentation: () => {
        if (presentationState.type === 'idle') {
          activeWhiteboardInstance.getPresentationManager().startPresentation();
        } else if (presentationState.type === 'presenting') {
          activeWhiteboardInstance.getPresentationManager().stopPresentation();
        }
      },
    }),
    [activeWhiteboardInstance, presentationState]
  );
}
