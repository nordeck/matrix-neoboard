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

type DocumentVisibilityState = Document['visibilityState'];
import { fireEvent } from '@testing-library/react';
import { vi } from 'vitest';

export function mockDocumentVisibilityState(
  visibility: DocumentVisibilityState,
): void {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(visibility);
  document.dispatchEvent(new Event('visibilitychange'));
}

// jsdom lacks proper pointer event support and fields such as pointerType, clientX
// will be undefined in the event handlers if we use fireEvent.pointerMove
export function firePointerMoveEvent(
  element: Element | Node | Document | Window,
  options?: {} | undefined,
): boolean {
  const event = new Event('pointermove', { bubbles: true, cancelable: true });
  return fireEvent(element, Object.assign(event, options));
}
