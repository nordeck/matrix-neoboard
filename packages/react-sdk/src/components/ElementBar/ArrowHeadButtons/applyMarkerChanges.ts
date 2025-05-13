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

import { Elements } from '../../../state';
import { LineMarker } from '../../../state/crdt/documents/elements';
import { ElementUpdate } from '../../../state/types';

export function applyMarkerChanges(
  position: 'start' | 'end',
  elements: Elements,
  marker: string,
) {
  const updates: ElementUpdate[] = [];
  // Check if the marker is 'none' and set it to undefined
  const markerValue = marker === 'none' ? undefined : (marker as LineMarker);

  for (const [elementId, element] of Object.entries(elements)) {
    // Skip if the element is not a line
    if (element.type !== 'path' || element.kind !== 'line') {
      continue;
    }

    // Skip if the marker is already set to the target value
    const currentMarker =
      position === 'start' ? element.startMarker : element.endMarker;
    if (currentMarker === markerValue) {
      continue;
    }

    const patchObject = {
      [position === 'start' ? 'startMarker' : 'endMarker']: markerValue,
    };

    updates.push({
      elementId,
      patch: patchObject,
    });
  }

  return updates;
}

export function applyMarkerSwitch(elements: Elements) {
  const updates: ElementUpdate[] = [];

  for (const [elementId, element] of Object.entries(elements)) {
    // Skip if the element is not a line
    if (element.type !== 'path' || element.kind !== 'line') {
      continue;
    }

    // Skip if both markers are the same
    if (element.startMarker === element.endMarker) {
      continue;
    }

    updates.push({
      elementId,
      patch: {
        startMarker: element.endMarker,
        endMarker: element.startMarker,
      },
    });
  }

  return updates;
}
