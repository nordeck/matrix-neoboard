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

import { useWidgetApi } from '@matrix-widget-toolkit/react';
import { useMemo } from 'react';
import { useObservable } from 'react-use';
import { Point } from './crdt';
import { useWhiteboardSlideInstance } from './useWhiteboardSlideInstance';

export function useActiveCursors(): Record<string, Point> {
  const widgetApi = useWidgetApi();
  const ownUserId = widgetApi.widgetParameters.userId;
  const slideInstance = useWhiteboardSlideInstance();

  const allActiveCursors = useObservable(
    slideInstance.observeCursorPositions(),
    {},
  );
  const activeCursors = useMemo(() => {
    return Object.fromEntries(
      Object.entries(allActiveCursors)
        // In case you want to test cursor behavior locally with two tabs but a
        // single user, remove this filter condition.
        .filter(([userId]) => userId !== ownUserId),
    );
  }, [allActiveCursors, ownUserId]);

  return activeCursors;
}
