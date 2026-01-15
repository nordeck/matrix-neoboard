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

import Joi from 'joi';
import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { mockLineElement } from '../../../lib/testUtils';
import { ChangeFn, Document } from '../types';
import { YArray, YMap, YText, applyMigrations } from '../y';
import {
  generateAddElement,
  generateAddSlide,
  generateLockSlide,
  generateRemoveSlide,
  generateUnlockSlide,
  generateUpdateElement,
} from './operations';
import {
  WhiteboardDocument,
  createWhiteboardDocument,
  isValidWhiteboardDocument,
  isValidWhiteboardDocumentSnapshot,
  keepWhiteboardUndoRedoItem,
  whiteboardDocumentMigrations,
  whiteboardDocumentSchema,
} from './whiteboardDocument';

const slide0 = 'IN4h74suMiIAK4AVMAdl_';

describe('initializeWhiteboardDocument', () => {
  it('should perform migration', () => {
    const doc = new Y.Doc();
    applyMigrations(doc, whiteboardDocumentMigrations.slice(0, 1));
    expect(doc.getMap('0').toJSON()).toEqual({
      slides: {
        [slide0]: {
          elementIds: [],
          elements: {},
        },
      },
      slideIds: [slide0],
    });
  });

  it('should not change its binary representation', () => {
    expect(whiteboardDocumentMigrations[0]).toEqual(
      new Uint8Array([
        1, 6, 0, 0, 39, 1, 1, 48, 6, 115, 108, 105, 100, 101, 115, 1, 39, 0, 0,
        0, 21, 73, 78, 52, 104, 55, 52, 115, 117, 77, 105, 73, 65, 75, 52, 65,
        86, 77, 65, 100, 108, 95, 1, 39, 0, 0, 1, 8, 101, 108, 101, 109, 101,
        110, 116, 115, 1, 39, 0, 0, 1, 10, 101, 108, 101, 109, 101, 110, 116,
        73, 100, 115, 0, 39, 1, 1, 48, 8, 115, 108, 105, 100, 101, 73, 100, 115,
        0, 8, 0, 0, 4, 1, 119, 21, 73, 78, 52, 104, 55, 52, 115, 117, 77, 105,
        73, 65, 75, 52, 65, 86, 77, 65, 100, 108, 95, 0,
      ]),
    );
  });
});

describe('whiteboardDocumentSchema', () => {
  it('should accept empty document', () => {
    const data = {
      slides: {},
      slideIds: [],
    };

    expect(whiteboardDocumentSchema.validate(data).error).toBeUndefined();
  });

  it('should accept empty slide', () => {
    const data = {
      slides: {
        'slide-0': {
          elements: {},
          elementIds: [],
        },
      },
      slideIds: ['slide-0'],
    };

    expect(whiteboardDocumentSchema.validate(data).error).toBeUndefined();
  });

  it('should accept document', () => {
    const data = {
      slides: {
        'slide-0': {
          elements: {
            'element-0': {
              type: 'path',
              position: { x: 1, y: 2 },
              kind: 'line',
              points: [],
              strokeColor: 'red',
            },
          },
          elementIds: ['element-0'],
        },
      },
      slideIds: ['slide-0'],
    };

    expect(whiteboardDocumentSchema.validate(data).error).toBeUndefined();
  });

  it('should accept additional properties', () => {
    const data = {
      slides: {
        'slide-0': {
          elements: {
            'element-0': {
              type: 'path',
              position: { x: 1, y: 2 },
              kind: 'line',
              points: [],
              strokeColor: 'red',
              additional: 'data',
            },
          },
          elementIds: ['element-0'],
          lock: {
            userId: '@user-id:example.com',
            additional: 'data',
          },
          additional: 'data',
        },
      },
      slideIds: ['slide-0'],
      additional: 'data',
    };

    expect(whiteboardDocumentSchema.validate(data).error).toBeUndefined();
  });

  it.each<object>([
    { slides: undefined },
    { slides: null },
    { slides: 111 },
    { slides: [undefined] },
    { slides: [null] },
    { slides: [111] },
    { slides: { s: {} } },
    { slides: { s: { elements: undefined, elementIds: [] } } },
    { slides: { s: { elements: null, elementIds: [] } } },
    { slides: { s: { elements: 111, elementIds: [] } } },
    { slides: { s: { elements: [undefined], elementIds: [] } } },
    { slides: { s: { elements: [null], elementIds: [] } } },
    { slides: { s: { elements: [111], elementIds: [] } } },
    {
      slides: {
        s: { elements: { constructor: mockLineElement() }, elementIds: [] },
      },
    },
    { slides: { s: { elements: [{}], elementIds: [] } } },
    { slides: { s: { elements: {}, elementIds: undefined } } },
    { slides: { s: { elements: {}, elementIds: null } } },
    { slides: { s: { elements: {}, elementIds: 111 } } },
    { slides: { s: { elements: {}, elementIds: [undefined] } } },
    { slides: { s: { elements: {}, elementIds: [null] } } },
    { slides: { s: { elements: {}, elementIds: [111] } } },
    { slides: { s: { elements: {}, elementIds: ['__proto__'] } } },
    { slides: { s: { elements: {}, elementIds: ['constructor'] } } },
    { slides: { s: { elements: {}, elementIds: [], lock: null } } },
    { slides: { s: { elements: {}, elementIds: [], lock: 111 } } },
    { slides: { s: { elements: {}, elementIds: [], lock: {} } } },
    {
      slides: {
        s: { elements: {}, elementIds: [], lock: { userId: undefined } },
      },
    },
    { slides: { s: { elements: {}, elementIds: [], lock: { userId: null } } } },
    { slides: { s: { elements: {}, elementIds: [], lock: { userId: 111 } } } },
    { slideIds: undefined },
    { slideIds: null },
    { slideIds: 111 },
  ])('should reject event with patch %j', (patch: object) => {
    const data = {
      slides: {},
      slideIds: [],
      ...patch,
    };

    expect(whiteboardDocumentSchema.validate(data).error).toBeInstanceOf(
      Joi.ValidationError,
    );
  });
});

describe('isValidWhiteboardDocument', () => {
  it('should accept event', () => {
    const document = createWhiteboardDocument();

    document.performChange(generateAddSlide()[0]);

    expect(isValidWhiteboardDocument(document)).toBe(true);
  });

  it('should accept additional properties', () => {
    const document = createWhiteboardDocument();

    document.performChange(generateAddSlide()[0]);

    document.performChange((doc) => {
      (doc as YMap<unknown>).set('additional', 'data');
    });

    expect(isValidWhiteboardDocument(document)).toBe(true);
  });

  it.each<object>([
    { slides: undefined },
    { slides: null },
    { slides: 111 },
    { slides: new YArray() },
    { slideIds: undefined },
    { slideIds: null },
    { slideIds: 111 },
    { slideIds: new YText() },
  ])('should reject event with patch %j', async (patch: object) => {
    const document = createWhiteboardDocument();

    document.performChange(generateAddSlide()[0]);

    document.performChange((doc) => {
      Object.entries(patch).forEach(([key, value]) => {
        (doc as YMap<unknown>).set(key, value);
      });
    });
    // Handler for the yjs throws
    const error = await new Promise<Error | null>((resolve) => {
      process.once('uncaughtException', (err: Error) => {
        resolve(err);
      });
      expect(isValidWhiteboardDocument(document)).toBe(false);

      // The YArray case wont return an error so we need to resolve it manually
      // @ts-expect-error - We have unclear types here
      if (patch.slides instanceof YArray) {
        resolve(null);
      }
    });
    // @ts-expect-error - We have unclear types here
    if (!(patch.slides instanceof YArray)) {
      // eslint-disable-next-line vitest/no-conditional-expect
      expect(error).toBeInstanceOf(Error);
    }
  });
});

describe('isValidWhiteboardDocumentSnapshot', () => {
  it('should accept valid document', () => {
    const document = createWhiteboardDocument();

    expect(isValidWhiteboardDocumentSnapshot(document.store())).toBe(true);
  });

  it('should reject invalid document', () => {
    const document = createWhiteboardDocument();

    expect(
      isValidWhiteboardDocumentSnapshot(document.store().subarray(0, 10)),
    ).toBe(false);
  });

  it('should reject mismatching document', () => {
    const document = createWhiteboardDocument();

    document.performChange((doc) => {
      (doc as YMap<unknown>).set('slides', new YArray());
    });

    expect(isValidWhiteboardDocumentSnapshot(document.store())).toBe(false);
  });
});

describe('keepWhiteboardUndoRedoItem', () => {
  it('should accept changes when slide is not locked', () => {
    const document = createWhiteboardDocument();

    const hasKeepChanges = keepWhiteboardUndoRedoItem(document.getData());

    expect(
      hasKeepChanges([
        {
          props: ['slides', slide0, 'elements', 'element-0', 'width'],
          isInsertion: true,
          isDeletion: true,
        },
      ]),
    ).toBe(true);
  });

  it('should reject changes when slide is locked', () => {
    const document = createWhiteboardDocument();
    document.performChange(generateLockSlide(slide0, '@user-id:example.com'));

    const hasKeepChanges = keepWhiteboardUndoRedoItem(document.getData());

    expect(
      hasKeepChanges([
        {
          props: ['slides', slide0, 'elements', 'element-0', 'width'],
          isInsertion: true,
          isDeletion: true,
        },
      ]),
    ).toBe(false);
  });

  it('should accept undo changes when slide lock is part of the undo stack', () => {
    const document = createWhiteboardDocument();
    document.performChange(generateLockSlide(slide0, '@user-id:example.com'));

    const hasKeepChanges = keepWhiteboardUndoRedoItem(document.getData());

    expect(
      hasKeepChanges([
        {
          props: ['slides', slide0, 'elements', 'element-0', 'width'],
          isInsertion: true,
          isDeletion: true,
        },
      ]),
    ).toBe(false);

    expect(
      hasKeepChanges([
        {
          props: ['slides', slide0, 'lock'],
          isInsertion: true,
          isDeletion: false,
        },
      ]),
    ).toBe(true);

    expect(
      hasKeepChanges([
        {
          props: ['slides', slide0, 'elements', 'element-0', 'width'],
          isInsertion: true,
          isDeletion: true,
        },
      ]),
    ).toBe(true);
  });

  it('should accept redo changes when slide lock is part of the redo stack', () => {
    const document = createWhiteboardDocument();

    const hasKeepChanges = keepWhiteboardUndoRedoItem(document.getData());

    expect(
      hasKeepChanges([
        {
          props: ['slides', slide0, 'elements', 'element-0', 'width'],
          isInsertion: true,
          isDeletion: true,
        },
      ]),
    ).toBe(true);

    expect(
      hasKeepChanges([
        {
          props: ['slides', slide0, 'lock'],
          isInsertion: true,
          isDeletion: false,
        },
      ]),
    ).toBe(true);
  });

  it('should accept slide deletion if this is not the last slide', () => {
    const document = createWhiteboardDocument();

    const [addSlide1] = generateAddSlide();
    document.performChange(addSlide1);

    const hasKeepChanges = keepWhiteboardUndoRedoItem(document.getData());

    expect(
      hasKeepChanges([
        {
          props: ['slides', slide0],
          isInsertion: true,
          isDeletion: false,
        },
      ]),
    ).toBe(true);
  });

  it('should accept slide deletion if a new slide is added in the same change', () => {
    const document = createWhiteboardDocument();

    const hasKeepChanges = keepWhiteboardUndoRedoItem(document.getData());

    expect(
      hasKeepChanges([
        {
          props: ['slides', slide0],
          isInsertion: true,
          isDeletion: false,
        },
        {
          props: ['slides', 'slide-1'],
          isInsertion: false,
          isDeletion: true,
        },
      ]),
    ).toBe(true);
  });

  it('should reject slide deletion if this is the last slide', () => {
    const document = createWhiteboardDocument();

    const hasKeepChanges = keepWhiteboardUndoRedoItem(document.getData());

    expect(
      hasKeepChanges([
        {
          props: ['slides', slide0],
          isInsertion: true,
          isDeletion: false,
        },
      ]),
    ).toBe(false);
  });

  it('should skip undo entries that conflict with a lock when called by the undo manager', () => {
    const document = createWhiteboardDocument();

    const [addElement, element0] = generateAddElement(
      slide0,
      mockLineElement(),
    );

    const moveElement = generateUpdateElement(slide0, element0, {
      position: { x: 15, y: 100 },
    });

    const lockSlide = generateLockSlide(slide0, '@user-id:example.com');

    document.performChange(addElement);
    document.performChange(moveElement);

    expect(document.getData().toJSON()).toEqual({
      slideIds: [slide0],
      slides: {
        [slide0]: {
          elementIds: [element0],
          elements: {
            [element0]: expect.objectContaining({
              position: { x: 15, y: 100 },
            }),
          },
        },
      },
    });

    document.getUndoManager().undo();
    expect(document.getData().toJSON()).toEqual({
      slideIds: [slide0],
      slides: {
        [slide0]: {
          elementIds: [element0],
          elements: {
            [element0]: expect.objectContaining({
              position: { x: 0, y: 1 },
            }),
          },
        },
      },
    });

    performRemoteChange(document, lockSlide);

    document.getUndoManager().undo();
    expect(document.getData().toJSON()).toEqual({
      slideIds: [slide0],
      slides: {
        [slide0]: {
          elementIds: [element0],
          elements: {
            [element0]: expect.objectContaining({
              position: { x: 0, y: 1 },
            }),
          },
          lock: { userId: '@user-id:example.com' },
        },
      },
    });
  });

  it('should skip redo entries that conflict with a lock when called by the undo manager', () => {
    const document = createWhiteboardDocument();

    const [addElement, element0] = generateAddElement(
      slide0,
      mockLineElement(),
    );

    const moveElement = generateUpdateElement(slide0, element0, {
      position: { x: 15, y: 100 },
    });

    const lockSlide = generateLockSlide(slide0, '@user-id:example.com');

    document.performChange(addElement);
    document.performChange(moveElement);
    document.getUndoManager().undo();
    document.getUndoManager().undo();

    expect(document.getData().toJSON()).toEqual({
      slideIds: [slide0],
      slides: {
        [slide0]: {
          elementIds: [],
          elements: {},
        },
      },
    });

    document.getUndoManager().redo();
    expect(document.getData().toJSON()).toEqual({
      slideIds: [slide0],
      slides: {
        [slide0]: {
          elementIds: [element0],
          elements: {
            [element0]: expect.objectContaining({
              position: { x: 0, y: 1 },
            }),
          },
        },
      },
    });

    performRemoteChange(document, lockSlide);

    document.getUndoManager().redo();
    expect(document.getData().toJSON()).toEqual({
      slideIds: [slide0],
      slides: {
        [slide0]: {
          elementIds: [element0],
          elements: {
            [element0]: expect.objectContaining({
              position: { x: 0, y: 1 },
            }),
          },
          lock: { userId: '@user-id:example.com' },
        },
      },
    });
  });

  it('should undo consecutive locks and unlocks when called by the undo manager', () => {
    const document = createWhiteboardDocument();

    const lockSlide = generateLockSlide(slide0, '@user-id:example.com');
    const unlockSlide = generateUnlockSlide(slide0);

    document.performChange(lockSlide);
    document.performChange(unlockSlide);
    document.performChange(lockSlide);
    document.performChange(unlockSlide);
    document.performChange(lockSlide);
    document.performChange(unlockSlide);

    expect(document.getData().toJSON().slides[slide0].lock).toBeUndefined();

    document.getUndoManager().undo();
    expect(document.getData().toJSON().slides[slide0].lock).toEqual({
      userId: '@user-id:example.com',
    });

    document.getUndoManager().undo();
    expect(document.getData().toJSON().slides[slide0].lock).toBeUndefined();

    document.getUndoManager().undo();
    expect(document.getData().toJSON().slides[slide0].lock).toEqual({
      userId: '@user-id:example.com',
    });

    document.getUndoManager().undo();
    expect(document.getData().toJSON().slides[slide0].lock).toBeUndefined();

    document.getUndoManager().undo();
    expect(document.getData().toJSON().slides[slide0].lock).toEqual({
      userId: '@user-id:example.com',
    });

    document.getUndoManager().undo();
    expect(document.getData().toJSON().slides[slide0].lock).toBeUndefined();
  });

  it('should not delete the last slide on undo when called by the undo manager', () => {
    const document = createWhiteboardDocument();

    const removeSlide0 = generateRemoveSlide(slide0);
    const [addSlide1, slide1] = generateAddSlide();

    expect(document.getData().toJSON().slideIds).toEqual([slide0]);

    // we add a slide and a remote user deletes the initial slide.
    // An undo would delete slide1, which we don't want to do.
    document.performChange(addSlide1);
    performRemoteChange(document, removeSlide0);

    expect(document.getData().toJSON().slideIds).toEqual([slide1]);

    document.getUndoManager().undo();
    expect(document.getData().toJSON().slideIds).toEqual([slide1]);
  });
});

function performRemoteChange(
  document: Document<WhiteboardDocument>,
  callback: ChangeFn<WhiteboardDocument>,
) {
  const documentClone = document.clone();
  documentClone.performChange(callback);
  document.mergeFrom(documentClone.store());
}
