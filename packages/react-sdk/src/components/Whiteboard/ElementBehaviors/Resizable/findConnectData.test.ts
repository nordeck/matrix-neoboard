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

import { beforeAll, describe, expect, it, vi } from 'vitest';
import { findConnectData } from './findConnectData';

beforeAll(() => {
  document.elementsFromPoint = vi.fn().mockReturnValue([]);
});

describe('findConnectData', () => {
  it('should find no elements to connect', () => {
    vi.mocked(document.elementsFromPoint).mockReturnValue([
      mockElement(),
      mockElement({ key: 'value' }),
      mockElement({ key1: 'value1' }),
    ]);
    expect(findConnectData(10, 10, 1)).toEqual({ connectElementIds: [] });
  });

  it('should find elements to connect when hover single activation area', () => {
    vi.mocked(document.elementsFromPoint).mockReturnValue([
      mockElement(),
      mockElement({ key: 'value' }),
      mockElement({
        ['data-connect-type']: 'activation-area',
        ['data-connect-element-id']: 'shape-id-1',
      }),
      mockElement({ key2: 'value2' }),
    ]);
    expect(findConnectData(10, 10, 1)).toEqual({
      connectElementIds: ['shape-id-1'],
    });
  });

  it('should ignore elements to connect after svg element', () => {
    vi.mocked(document.elementsFromPoint).mockReturnValue([
      mockElement({}, 'svg'),
      mockElement({
        ['data-connect-type']: 'activation-area',
        ['data-connect-element-id']: 'shape-id-1',
      }),
    ]);
    expect(findConnectData(10, 10, 1)).toEqual({
      connectElementIds: [],
    });
  });

  it('should find elements to connect when hover several activation areas', () => {
    vi.mocked(document.elementsFromPoint).mockReturnValue([
      mockElement(),
      mockElement({ key: 'value' }),
      mockElement({
        ['data-connect-type']: 'activation-area',
        ['data-connect-element-id']: 'shape-id-1',
      }),
      mockElement({
        ['data-connect-type']: 'activation-area',
        ['data-connect-element-id']: 'shape-id-2',
      }),
      mockElement({ key1: 'value1' }),
      mockElement({
        ['data-connect-type']: 'activation-area',
        ['data-connect-element-id']: 'shape-id-3',
      }),
      mockElement({ key2: 'value2' }),
    ]);
    expect(findConnectData(10, 10, 1)).toEqual({
      connectElementIds: ['shape-id-1', 'shape-id-2', 'shape-id-3'],
    });
  });

  it('should find elements to connect when hover several activation areas and a shape', () => {
    vi.mocked(document.elementsFromPoint).mockReturnValue([
      mockElement(),
      mockElement({
        ['data-connect-type']: 'activation-area',
        ['data-connect-element-id']: 'shape-id-1',
      }),
      mockElement({
        ['data-connect-type']: 'activation-area',
        ['data-connect-element-id']: 'shape-id-2',
      }),
      mockElement({
        ['data-connect-type']: 'connectable-element',
      }),
      mockElement({ key1: 'value1' }),
      mockElement({
        ['data-connect-type']: 'activation-area',
        ['data-connect-element-id']: 'shape-id-3',
      }),
      mockElement({
        ['data-connect-type']: 'activation-area',
        ['data-connect-element-id']: 'shape-id-4',
      }),
      mockElement({
        ['data-connect-type']: 'connectable-element',
      }),
    ]);
    expect(findConnectData(10, 10, 1)).toEqual({
      connectElementIds: ['shape-id-1', 'shape-id-2'],
    });
  });

  it('should find elements to connect when hover several activation areas and a connection point area', () => {
    vi.mocked(document.elementsFromPoint).mockReturnValue([
      mockElement(),
      mockElement({
        ['data-connect-type']: 'activation-area',
        ['data-connect-element-id']: 'shape-id-1',
      }),
      mockElement({
        ['data-connect-type']: 'activation-area',
        ['data-connect-element-id']: 'shape-id-2',
      }),
      mockElement({
        ['data-connect-type']: 'connection-point-area',
        ['data-connect-element-id']: 'shape-id-3',
      }),
      mockElement({
        ['data-connect-type']: 'activation-area',
        ['data-connect-element-id']: 'shape-id-3',
      }),
      mockElement({
        ['data-connect-type']: 'connectable-element',
      }),
      mockElement({ key1: 'value1' }),
      mockElement({
        ['data-connect-type']: 'activation-area',
        ['data-connect-element-id']: 'shape-id-4',
      }),
    ]);
    expect(findConnectData(10, 10, 1)).toEqual({
      connectElementIds: ['shape-id-1', 'shape-id-2', 'shape-id-3'],
      connectPoint: { x: 20, y: 20 },
    });
  });

  it('should find elements to connect when hover several activation areas and a connection point', () => {
    vi.mocked(document.elementsFromPoint).mockReturnValue([
      mockElement(),
      mockElement({
        ['data-connect-type']: 'activation-area',
        ['data-connect-element-id']: 'shape-id-1',
      }),
      mockElement({
        ['data-connect-type']: 'activation-area',
        ['data-connect-element-id']: 'shape-id-2',
      }),
      mockElement({
        ['data-connect-type']: 'connection-point',
        ['data-connect-element-id']: 'shape-id-3',
      }),
      mockElement({
        ['data-connect-type']: 'connection-point-area',
        ['data-connect-element-id']: 'shape-id-3',
      }),
      mockElement({
        ['data-connect-type']: 'activation-area',
        ['data-connect-element-id']: 'shape-id-3',
      }),
      mockElement({
        ['data-connect-type']: 'connectable-element',
      }),
      mockElement({ key1: 'value1' }),
      mockElement({
        ['data-connect-type']: 'activation-area',
        ['data-connect-element-id']: 'shape-id-4',
      }),
    ]);
    expect(findConnectData(10, 10, 1)).toEqual({
      connectElementIds: ['shape-id-1', 'shape-id-2', 'shape-id-3'],
      connectPoint: { x: 20, y: 20 },
    });
  });
});

function mockElement(
  attributes: Record<string, string> = {},
  localName: string = 'rect',
  domRect: DOMRect = {
    x: 0,
    y: 0,
    width: 40,
    height: 40,
  } as unknown as DOMRect,
): Element {
  return {
    localName,
    getAttribute(qualifiedName: string): string | null {
      return attributes[qualifiedName] ?? null;
    },
    getBoundingClientRect(): DOMRect {
      return domRect;
    },
  } as unknown as Element;
}
