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

import { isValidWhiteboardExportDocument } from './whiteboardDocumentExport';

describe('isValidWhiteboardExportDocument', () => {
  it('should accept empty document', () => {
    expect(
      isValidWhiteboardExportDocument({
        version: 'net.nordeck.whiteboard@v1',
        whiteboard: {
          slides: [],
        },
      })
    ).toBe(true);
  });

  it('should accept empty slide', () => {
    expect(
      isValidWhiteboardExportDocument({
        version: 'net.nordeck.whiteboard@v1',
        whiteboard: {
          slides: [{ elements: [] }],
        },
      })
    ).toBe(true);
  });

  it('should accept document with slide', () => {
    expect(
      isValidWhiteboardExportDocument({
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
      })
    ).toBe(true);
  });

  it('should accept additional properties', () => {
    expect(
      isValidWhiteboardExportDocument({
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
      })
    ).toBe(true);
  });

  it.each<Object>([
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
    { whiteboard: { slides: [{ elements: [], lock: null }] } },
    { whiteboard: { slides: [{ elements: [], lock: 111 }] } },
  ])('should reject event with patch %j', (patch: Object) => {
    expect(
      isValidWhiteboardExportDocument({
        version: 'net.nordeck.whiteboard@v1',
        whiteboard: {
          slides: [],
        },
        ...patch,
      })
    ).toBe(false);
  });
});
