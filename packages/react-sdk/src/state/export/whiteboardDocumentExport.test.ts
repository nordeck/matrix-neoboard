/*
 * Copyright 2022 Nordeck IT + Consulting GmbH
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

import { describe, expect, it } from 'vitest';
import {
  mockFrameElement,
  mockImageElement,
  mockRectangleElement,
} from '../../lib/testUtils';
import { WhiteboardDocumentVersion } from '../crdt';
import {
  extractWhiteboardDocumentVersionFromExportString,
  isValidWhiteboardExportDocument,
  whiteboardDocumentVersionToExportString,
} from './whiteboardDocumentExport';

describe('whiteboardDocumentVersionToExportString', () => {
  it('should export initial whiteboard version to string', () => {
    expect(
      whiteboardDocumentVersionToExportString(
        WhiteboardDocumentVersion.Initial,
      ),
    ).toBe('net.nordeck.whiteboard@v1');
  });

  it('should export frames whiteboard version to string', () => {
    expect(
      whiteboardDocumentVersionToExportString(WhiteboardDocumentVersion.Frames),
    ).toBe('net.nordeck.whiteboard@v2');
  });
});

describe('extractWhiteboardDocumentVersionFromExportString', () => {
  it('should extract initial whiteboard document version', () => {
    expect(
      extractWhiteboardDocumentVersionFromExportString(
        'net.nordeck.whiteboard@v1',
      ),
    ).toBe(WhiteboardDocumentVersion.Initial);
  });

  it('should extract frames whiteboard document version', () => {
    expect(
      extractWhiteboardDocumentVersionFromExportString(
        'net.nordeck.whiteboard@v2',
      ),
    ).toBe(WhiteboardDocumentVersion.Frames);
  });

  it('should throw when extract unknown whiteboard document version', () => {
    expect(() =>
      extractWhiteboardDocumentVersionFromExportString(
        'net.nordeck.whiteboard@v100',
      ),
    ).toThrow('Unexpected whiteboard document version: 99');
  });

  it('should throw when extract unknown version', () => {
    expect(() =>
      extractWhiteboardDocumentVersionFromExportString('other@v2'),
    ).toThrow('Unexpected whiteboard document version export string: other@v2');
  });
});

describe('isValidWhiteboardExportDocument', () => {
  it('should accept empty document', () => {
    expect(
      isValidWhiteboardExportDocument(WhiteboardDocumentVersion.Initial, {
        version: 'net.nordeck.whiteboard@v1',
        whiteboard: {
          slides: [],
        },
      }),
    ).toBe(true);
  });

  it('should accept empty slide', () => {
    expect(
      isValidWhiteboardExportDocument(WhiteboardDocumentVersion.Initial, {
        version: 'net.nordeck.whiteboard@v1',
        whiteboard: {
          slides: [{ elements: [] }],
        },
      }),
    ).toBe(true);
  });

  it('should accept document with slide', () => {
    expect(
      isValidWhiteboardExportDocument(WhiteboardDocumentVersion.Initial, {
        version: 'net.nordeck.whiteboard@v1',
        whiteboard: {
          slides: [
            {
              elements: [
                {
                  type: 'path',
                  position: { x: 1, y: 2 },
                  kind: 'line',
                  points: [],
                  strokeColor: 'red',
                },
              ],
              lock: {},
            },
          ],
        },
      }),
    ).toBe(true);
  });

  it('should accept document with connected elements', () => {
    expect(
      isValidWhiteboardExportDocument(WhiteboardDocumentVersion.Initial, {
        version: 'net.nordeck.whiteboard@v1',
        whiteboard: {
          slides: [
            {
              elements: [
                {
                  id: 'element-id-0',
                  type: 'shape',
                  kind: 'rectangle',
                  position: { x: 100, y: 100 },
                  fillColor: '#ffffff',
                  height: 200,
                  width: 200,
                  text: 'Hello World',
                  connectedPaths: ['element-id-1'],
                },
                {
                  id: 'element-id-1',
                  type: 'path',
                  position: { x: 1, y: 2 },
                  kind: 'line',
                  points: [
                    { x: 0, y: 0 },
                    { x: 400, y: 400 },
                  ],
                  strokeColor: 'red',
                  connectedElementStart: 'element-id-0',
                },
              ],
              lock: {},
            },
          ],
        },
      }),
    ).toBe(true);
  });

  it('should accept document with attachments', () => {
    expect(
      isValidWhiteboardExportDocument(WhiteboardDocumentVersion.Initial, {
        version: 'net.nordeck.whiteboard@v1',
        whiteboard: {
          slides: [
            {
              elements: [
                {
                  id: 'element-id-0',
                  type: 'shape',
                  kind: 'rectangle',
                  position: { x: 100, y: 100 },
                  fillColor: '#ffffff',
                  height: 200,
                  width: 200,
                  text: 'Hello World',
                  attachedFrame: 'element-id-3',
                },
                {
                  id: 'element-id-1',
                  type: 'path',
                  kind: 'line',
                  position: { x: 0, y: 1 },
                  strokeColor: '#ffffff',
                  points: [
                    { x: 0, y: 1 },
                    { x: 2, y: 3 },
                  ],
                  attachedFrame: 'element-id-3',
                },
                {
                  id: 'element-id-2',
                  type: 'image',
                  mxc: 'mxc://example.com/test1234',
                  fileName: 'test.jpg',
                  position: { x: 10, y: 20 },
                  width: 200,
                  height: 100,
                  attachedFrame: 'element-id-3',
                },
                {
                  id: 'element-id-3',
                  type: 'frame',
                  position: { x: 50, y: 100 },
                  width: 100,
                  height: 200,
                  attachedElements: [
                    'element-id-0',
                    'element-id-1',
                    'element-id-2',
                  ],
                },
              ],
              lock: {},
            },
          ],
        },
      }),
    ).toBe(true);
  });

  it('should accept additional properties', () => {
    expect(
      isValidWhiteboardExportDocument(WhiteboardDocumentVersion.Initial, {
        version: 'net.nordeck.whiteboard@v1',
        whiteboard: {
          slides: [
            {
              elements: [
                {
                  type: 'path',
                  position: { x: 1, y: 2 },
                  kind: 'line',
                  points: [],
                  strokeColor: 'red',
                  additional: 'tmp',
                },
              ],
              lock: {
                additional: 'tmp',
              },
              additional: 'tmp',
            },
          ],
          additional: 'tmp',
        },
      }),
    ).toBe(true);
  });

  it('should accept document with initial schema when upper whiteboard document version is frames', () => {
    expect(
      isValidWhiteboardExportDocument(WhiteboardDocumentVersion.Frames, {
        version: 'net.nordeck.whiteboard@v1',
        whiteboard: {
          slides: [],
        },
      }),
    ).toBe(true);
  });

  it('should accept document with frames schema when upper whiteboard document version is frames', () => {
    expect(
      isValidWhiteboardExportDocument(WhiteboardDocumentVersion.Frames, {
        version: 'net.nordeck.whiteboard@v2',
        whiteboard: {
          slides: [],
        },
      }),
    ).toBe(true);
  });

  it('should reject document with frames schema when upper whiteboard document version is initial', () => {
    expect(
      isValidWhiteboardExportDocument(WhiteboardDocumentVersion.Initial, {
        version: 'net.nordeck.whiteboard@v2',
        whiteboard: {
          slides: [],
        },
      }),
    ).toBe(false);
  });

  it.each<object>([
    { version: undefined },
    { version: null },
    { version: '' },
    { version: 'other@v2' },
    { version: 111 },
    { whiteboard: undefined },
    { whiteboard: null },
    { whiteboard: 111 },
    { whiteboard: { slides: undefined } },
    { whiteboard: { slides: null } },
    { whiteboard: { slides: 111 } },
    { whiteboard: { slides: [undefined] } },
    { whiteboard: { slides: [null] } },
    { whiteboard: { slides: [111] } },
    { whiteboard: { slides: [{ elements: undefined }] } },
    { whiteboard: { slides: [{ elements: null }] } },
    { whiteboard: { slides: [{ elements: 111 }] } },
    { whiteboard: { slides: [{ elements: [undefined] }] } },
    { whiteboard: { slides: [{ elements: [null] }] } },
    { whiteboard: { slides: [{ elements: [111] }] } },
    { whiteboard: { slides: [{ elements: [{}] }] } },
    {
      whiteboard: {
        slides: [{ elements: [{ id: null, ...mockRectangleElement() }] }],
      },
    },
    {
      whiteboard: {
        slides: [{ elements: [{ id: 111, ...mockRectangleElement() }] }],
      },
    },
    {
      whiteboard: {
        slides: [
          { elements: [{ id: '__proto__', ...mockRectangleElement() }] },
        ],
      },
    },
    {
      whiteboard: {
        slides: [
          { elements: [{ id: 'constructor', ...mockRectangleElement() }] },
        ],
      },
    },
    {
      whiteboard: {
        slides: [
          { elements: [{ id: '__proto__', ...mockRectangleElement() }] },
        ],
      },
    },
    {
      whiteboard: {
        slides: [
          { elements: [{ id: 'constructor', ...mockRectangleElement() }] },
        ],
      },
    },
    {
      whiteboard: {
        slides: [{ elements: [{ id: '__proto__', ...mockFrameElement() }] }],
      },
    },
    {
      whiteboard: {
        slides: [{ elements: [{ id: 'constructor', ...mockFrameElement() }] }],
      },
    },
    {
      whiteboard: {
        slides: [{ elements: [{ id: '__proto__', ...mockImageElement() }] }],
      },
    },
    {
      whiteboard: {
        slides: [{ elements: [{ id: 'constructor', ...mockImageElement() }] }],
      },
    },
    { whiteboard: { slides: [{ elements: [], lock: null }] } },
    { whiteboard: { slides: [{ elements: [], lock: 111 }] } },
  ])('should reject event with patch %j', (patch: object) => {
    expect(
      isValidWhiteboardExportDocument(WhiteboardDocumentVersion.Initial, {
        version: 'net.nordeck.whiteboard@v1',
        whiteboard: {
          slides: [],
        },
        ...patch,
      }),
    ).toBe(false);
  });
});
