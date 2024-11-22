/*
 * Copyright 2024 Nordeck IT + Consulting GmbH
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
import { ArrowHeadLineEndMarker } from './ArrowHeadLineEndMarker';

type UseEndMarkerResult =
  | {
      /**
       * ID of the end marker object
       */
      endMarkerId: string;
      /**
       * Rendered end marker
       */
      endMarker: ReactElement;
    }
  | {
      /**
       * Undefined end marker ID means that there is no end marker
       */
      endMarkerId: undefined;
      endMarker: null;
    };

/**
 * Provide everything required to add an end marker.
 *
 * @param elementId - ID of the element to which the marker belongs
 * @param element - The element to which the marker belongs
 */
export function useEndMarker(element: PathElement): UseEndMarkerResult {
  const uniqueId = useId();
  const endMarkerId = `end-marker-${uniqueId}`;

  if (element.endMarker === 'arrow-head-line') {
    return {
      endMarkerId,
      endMarker: (
        <ArrowHeadLineEndMarker
          id={endMarkerId}
          strokeColor={element.strokeColor}
        />
      ),
    };
  }

  return { endMarkerId: undefined, endMarker: null };
}
