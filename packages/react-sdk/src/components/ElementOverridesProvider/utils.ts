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

import { Element } from '../../state';
import { ElementOverride } from './ElementOverridesProvider';

export function mergeElementAndOverride(
  element: Element,
  override: ElementOverride | undefined,
): Element {
  return element.type === 'path'
    ? {
        ...element,
        position: override?.position ?? element.position,
        points: override?.points ?? element.points,
      }
    : {
        ...element,
        height: override?.height ?? element.height,
        width: override?.width ?? element.width,
        position: override?.position ?? element.position,
      };
}
