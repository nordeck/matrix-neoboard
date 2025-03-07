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

import { Point } from '../../../../state';

type ConnectData = {
  /**
   * Elements to activate connection to.
   */
  connectElementIds: string[];

  /**
   * A connection point.
   */
  connectPoint?: Point;
};

/**
 * Uses document to find elements around x,y position and a connection point.
 * @param x viewport x position
 * @param y viewport y position
 * @param scale svg scale
 * @return connect data
 */
export function findConnectData(
  x: number,
  y: number,
  scale: number,
): ConnectData {
  const elements = document.elementsFromPoint(x * scale, y * scale);

  const connectElementIds: string[] = [];
  let connectPoint: Point | undefined;

  for (const element of elements) {
    if (element.localName === 'svg') {
      // svg element is found
      break;
    }

    const connectType = element.getAttribute('data-connect-type');
    if (connectType === 'connectable-element') {
      // shape element is found
      break;
    }

    if (
      connectType === 'activation-area' ||
      connectType === 'connection-point-area' ||
      connectType === 'connection-point'
    ) {
      const connectElementId = element.getAttribute('data-connect-element-id');

      if (connectElementId) {
        // push element id
        connectElementIds.push(connectElementId);
      } else {
        throw new Error('data-connect-element-id must be defined');
      }
    }

    if (
      connectType === 'connection-point-area' ||
      connectType === 'connection-point'
    ) {
      const rect = element.getBoundingClientRect();
      connectPoint = {
        x: (rect.x + rect.width / 2) / scale,
        y: (rect.y + rect.height / 2) / scale,
      };
      // connection point is found
      break;
    }
  }

  return {
    connectElementIds,
    connectPoint,
  };
}
