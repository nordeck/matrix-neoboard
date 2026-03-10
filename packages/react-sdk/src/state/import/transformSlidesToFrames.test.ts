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

import { nanoid } from '@reduxjs/toolkit';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import * as constants from '../../components/Whiteboard/constants';
import { mockEllipseElement, mockRectangleElement } from '../../lib/testUtils';
import { WhiteboardDocumentExport } from '../export';
import { transformSlidesToFrames } from './transformSlidesToFrames';

vi.mock('@reduxjs/toolkit', async () => ({
  ...(await vi.importActual<typeof import('@reduxjs/toolkit')>(
    '@reduxjs/toolkit',
  )),
  nanoid: vi.fn(),
}));

beforeAll(() => {
  vi.spyOn(constants, 'whiteboardWidth', 'get').mockReturnValue(19200);
  vi.spyOn(constants, 'whiteboardHeight', 'get').mockReturnValue(10800);
});

beforeEach(() => {
  let count = 0;
  vi.mocked(nanoid).mockImplementation(() => `mock-nanoid-${count++}`);
});

describe('transformSlidesToFrames', () => {
  it('should transform slides to frames', () => {
    const data: WhiteboardDocumentExport = {
      version: 'net.nordeck.whiteboard@v1',
      whiteboard: {
        slides: [
          {
            elements: [mockRectangleElement()],
          },
          {
            elements: [mockEllipseElement()],
          },
        ],
      },
    };

    expect(transformSlidesToFrames(data)).toEqual({
      version: 'net.nordeck.whiteboard@v1',
      whiteboard: {
        slides: [
          {
            elements: [
              {
                id: 'mock-nanoid-0',
                type: 'frame',
                position: { x: 7670, y: 4860 },
                width: 1920,
                height: 1080,
                attachedElements: ['mock-nanoid-1'],
              },
              {
                id: 'mock-nanoid-1',
                ...mockRectangleElement({
                  position: { x: 7670, y: 4861 },
                }),
                attachedFrame: 'mock-nanoid-0',
              },
              {
                id: 'mock-nanoid-2',
                type: 'frame',
                position: { x: 9610, y: 4860 },
                width: 1920,
                height: 1080,
                attachedElements: ['mock-nanoid-3'],
              },
              {
                id: 'mock-nanoid-3',
                ...mockEllipseElement({
                  position: { x: 9610, y: 4861 },
                }),
                attachedFrame: 'mock-nanoid-2',
              },
            ],
          },
        ],
      },
    });
  });

  it('should not transform a single slide', () => {
    const data: WhiteboardDocumentExport = {
      version: 'net.nordeck.whiteboard@v1',
      whiteboard: {
        slides: [
          {
            elements: [mockRectangleElement()],
          },
        ],
      },
    };

    expect(transformSlidesToFrames(data)).toBe(data);
  });
});
