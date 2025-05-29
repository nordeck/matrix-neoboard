/*
 * Copyright 2025 Nordeck IT + Consulting GmbH
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

import { ReactElement, useId } from 'react';
import { PathElement } from '../../../state';
import { ArrowHeadLineMarker } from './ArrowHeadLineMarker';

type UseStartMarkerResult =
  | {
      /**
       * ID of the start marker object
       */
      startMarkerId: string;
      /**
       * Rendered start marker
       */
      startMarker: ReactElement;
    }
  | {
      /**
       * Undefined start marker ID means that there is no start marker
       */
      startMarkerId: undefined;
      startMarker: null;
    };

/**
 * Provide everything required to add a start marker.
 *
 * @param elementId - ID of the element to which the marker belongs
 * @param element - The element to which the marker belongs
 */
export function useStartMarker(element: PathElement): UseStartMarkerResult {
  const uniqueId = useId();
  const startMarkerId = `start-marker-${uniqueId}`;

  if (element.startMarker === 'arrow-head-line') {
    return {
      startMarkerId,
      startMarker: (
        <ArrowHeadLineMarker
          id={startMarkerId}
          strokeColor={element.strokeColor}
        />
      ),
    };
  }

  return { startMarkerId: undefined, startMarker: null };
}
