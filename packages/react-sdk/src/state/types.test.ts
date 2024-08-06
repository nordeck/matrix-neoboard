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

import { isWhiteboardUndoManagerContext } from './types';

describe('isWhiteboardUndoManagerContext', () => {
  it('should accept context with slide id', () => {
    expect(
      isWhiteboardUndoManagerContext({
        currentSlideId: 'slide-0',
      }),
    ).toBe(true);
  });

  it('should accept context with slide id and undefined element id', () => {
    expect(
      isWhiteboardUndoManagerContext({
        currentSlideId: 'slide-0',
        currentElementIds: undefined,
      }),
    ).toBe(true);
  });

  it('should accept context with slide id and element id', () => {
    expect(
      isWhiteboardUndoManagerContext({
        currentSlideId: 'slide-0',
        currentElementIds: ['element-0'],
      }),
    ).toBe(true);
  });

  it('should accept context with additional properties', () => {
    expect(
      isWhiteboardUndoManagerContext({
        currentSlideId: 'slide-0',
        currentElementIds: ['element-0'],
        additional: 'data',
      }),
    ).toBe(true);
  });

  it.each<object>([
    { currentSlideId: undefined },
    { currentSlideId: null },
    { currentSlideId: 111 },
    { currentElementIds: null },
    { currentElementIds: 111 },
    { currentElementIds: ['element-0', 111] },
  ])('should reject context with patch %j', (patch: object) => {
    const data = {
      currentSlideId: 'slide-0',
      currentElementIds: ['element-0'],
      ...patch,
    };

    expect(isWhiteboardUndoManagerContext(data)).toBe(false);
  });
});
