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

import { beforeEach, describe, expect, it } from 'vitest';
import {
  mockEllipseElement,
  mockLineElement,
} from '../../../lib/testUtils/documentTestUtils';
import { Document } from '../types';
import {
  generate,
  generateAddElement,
  generateAddElements,
  generateAddSlide,
  generateDuplicateSlide,
  generateLockSlide,
  generateMoveDown,
  generateMoveElement,
  generateMoveElements,
  generateMoveSlide,
  generateMoveUp,
  generateRemoveElement,
  generateRemoveElements,
  generateRemoveSlide,
  generateUnlockSlide,
  generateUpdateElement,
  getElement,
  getNormalizedElementIds,
  getNormalizedSlideIds,
  getSlide,
  getSlideLock,
} from './operations';
import {
  WhiteboardDocument,
  createWhiteboardDocument,
} from './whiteboardDocument';

// createWhiteboardDocument() always contains a slide with this id
const slide0 = 'IN4h74suMiIAK4AVMAdl_';

describe('getSlide', () => {
  it('should return the slide', () => {
    const document = createWhiteboardDocument();

    expect(getSlide(document.getData(), slide0)?.toJSON()).toEqual({
      elementIds: [],
      elements: {},
    });
  });

  it('should return undefined if slide does not exist', () => {
    const document = createWhiteboardDocument();

    expect(getSlide(document.getData(), 'not-exists')).toBeUndefined();
  });
});

describe('getNormalizedSlideIds', () => {
  it('should skip duplicate slide ids', () => {
    const document = createWhiteboardDocument();

    document.performChange((doc) => {
      doc.get('slideIds').push([slide0]);
    });

    expect(getNormalizedSlideIds(document.getData())).toEqual([slide0]);
  });

  it('should skip deleted slides', () => {
    const document = createWhiteboardDocument();

    document.performChange((doc) => {
      doc.get('slides').delete(slide0);
    });

    expect(getNormalizedSlideIds(document.getData())).toEqual([]);
  });
});

describe('getSlideLock', () => {
  it('should return the lock state', () => {
    const document = createWhiteboardDocument();

    const lockSlide = generateLockSlide(slide0, '@user-id');
    document.performChange(lockSlide);

    expect(getSlideLock(document.getData(), slide0)).toEqual({
      userId: '@user-id',
    });
  });

  it('should return undefined if slide does not exist', () => {
    const document = createWhiteboardDocument();

    expect(getSlideLock(document.getData(), slide0)).toBeUndefined();
  });
});

describe('generateAddSlide', () => {
  it('should add slide', () => {
    const doc = createWhiteboardDocument();
    const [changeFn, slideId] = generateAddSlide();

    doc.performChange(changeFn);

    expect(slideId).toEqual(expect.any(String));
    expect(getSlide(doc.getData(), slideId)?.toJSON()).toEqual({
      elements: {},
      elementIds: [],
    });
    expect(getNormalizedSlideIds(doc.getData())).toEqual([slide0, slideId]);
  });
});

describe('generateDuplicateSlide', () => {
  it('should duplicate the slide', () => {
    const doc = createWhiteboardDocument();

    const [changeFn1, slide1] = generateAddSlide();
    doc.performChange(changeFn1);

    const lineElement = mockLineElement();
    const ellipseElement = mockEllipseElement();
    const [addElement0, element0] = generateAddElement(slide0, lineElement);
    doc.performChange(addElement0);
    const [addElement1, element1] = generateAddElement(slide0, ellipseElement);
    doc.performChange(addElement1);
    const moveElement = generateMoveElement(slide0, element1, 0);
    doc.performChange(moveElement);

    const [changeFn2, slide2] = generateDuplicateSlide(slide0);
    doc.performChange(changeFn2);

    const [newElement1, newElement0] = getNormalizedElementIds(
      doc.getData(),
      slide2,
    );

    expect(slide2).toEqual(expect.any(String));
    expect(slide2).not.toEqual(slide0);

    expect(newElement0).toEqual(expect.any(String));
    expect(newElement0).not.toEqual(element0);
    expect(newElement1).toEqual(expect.any(String));
    expect(newElement1).not.toEqual(element1);

    expect(getSlide(doc.getData(), slide2)?.toJSON()).toEqual({
      elements: {
        [newElement0]: lineElement,
        [newElement1]: ellipseElement,
      },
      elementIds: [newElement1, newElement0],
    });
    expect(getNormalizedSlideIds(doc.getData())).toEqual([
      slide0,
      slide2,
      slide1,
    ]);
  });

  it('should throw if the slide does not exist', () => {
    const doc = createWhiteboardDocument();

    const [changeFn] = generateDuplicateSlide('not-exists');

    expect(() => doc.performChange(changeFn)).toThrow(
      'Slide not found: not-exists',
    );
  });
});

describe('generateMoveSlide', () => {
  it('should reorder slides', () => {
    const doc = createWhiteboardDocument();

    const [changeFn1, slide1] = generateAddSlide();
    doc.performChange(changeFn1);
    const [changeFn2, slide2] = generateAddSlide();
    doc.performChange(changeFn2);
    const [changeFn3, slide3] = generateAddSlide();
    doc.performChange(changeFn3);

    doc.performChange(generateMoveSlide(slide1, 0));

    expect(getNormalizedSlideIds(doc.getData())).toEqual([
      slide1,
      slide0,
      slide2,
      slide3,
    ]);
  });

  it('should ignore missing element', () => {
    const doc = createWhiteboardDocument();

    const [changeFn1, slide1] = generateAddSlide();
    doc.performChange(changeFn1);
    const [changeFn2, slide2] = generateAddSlide();
    doc.performChange(changeFn2);
    const [changeFn3, slide3] = generateAddSlide();
    doc.performChange(changeFn3);

    doc.performChange(generateMoveSlide('not-exists', 0));

    expect(getNormalizedSlideIds(doc.getData())).toEqual([
      slide0,
      slide1,
      slide2,
      slide3,
    ]);
  });

  describe('should handle conflicts while reordering slides', () => {
    let aliceDoc: Document<WhiteboardDocument>;
    let bobDoc: Document<WhiteboardDocument>;
    let slide1: string;
    let slide2: string;
    let slide3: string;

    beforeEach(() => {
      aliceDoc = createWhiteboardDocument();

      const change1 = generateAddSlide();
      slide1 = change1[1];
      aliceDoc.performChange(change1[0]);
      const change2 = generateAddSlide();
      slide2 = change2[1];
      aliceDoc.performChange(change2[0]);
      const change3 = generateAddSlide();
      slide3 = change3[1];
      aliceDoc.performChange(change3[0]);

      bobDoc = createWhiteboardDocument();
      bobDoc.mergeFrom(aliceDoc.store());
    });

    it('should handle two users moving the same slide', () => {
      aliceDoc.performChange(generateMoveSlide(slide1, 0));

      expect(getNormalizedSlideIds(aliceDoc.getData())).toEqual([
        slide1,
        slide0,
        slide2,
        slide3,
      ]);

      bobDoc.performChange(generateMoveSlide(slide1, 0));
      expect(getNormalizedSlideIds(bobDoc.getData())).toEqual([
        slide1,
        slide0,
        slide2,
        slide3,
      ]);

      bobDoc.mergeFrom(aliceDoc.store());
      expect(getNormalizedSlideIds(bobDoc.getData())).toEqual([
        slide1,
        slide0,
        slide2,
        slide3,
      ]);
    });

    it('should handle two users moving different slides', () => {
      aliceDoc.performChange(generateMoveSlide(slide1, 0));
      expect(getNormalizedSlideIds(aliceDoc.getData())).toEqual([
        slide1,
        slide0,
        slide2,
        slide3,
      ]);

      bobDoc.performChange(generateMoveSlide(slide3, 0));
      expect(getNormalizedSlideIds(bobDoc.getData())).toEqual([
        slide3,
        slide0,
        slide1,
        slide2,
      ]);

      bobDoc.mergeFrom(aliceDoc.store());
      const bobSlideIds = getNormalizedSlideIds(bobDoc.getData());
      expect(bobSlideIds.slice(0, 2)).toEqual(
        // There is no guarantee for the order of the two operations, as the
        // conflict resolution depends on the random actor ids.
        expect.arrayContaining([slide1, slide3]),
      );
      expect(bobSlideIds.slice(2)).toEqual([slide0, slide2]);
    });

    it('should handle user adding new slide while another user is moving', () => {
      aliceDoc.performChange(generateMoveSlide(slide0, 3));
      expect(getNormalizedSlideIds(aliceDoc.getData())).toEqual([
        slide1,
        slide2,
        slide3,
        slide0,
      ]);

      const [changeFn4, slide4] = generateAddSlide();
      bobDoc.performChange(changeFn4);
      expect(getNormalizedSlideIds(bobDoc.getData())).toEqual([
        slide0,
        slide1,
        slide2,
        slide3,
        slide4,
      ]);

      bobDoc.mergeFrom(aliceDoc.store());

      const bobSlideIds = getNormalizedSlideIds(bobDoc.getData());
      expect(bobSlideIds.slice(0, 3)).toEqual([slide1, slide2, slide3]);
      expect(bobSlideIds.slice(3)).toEqual(
        // There is no guarantee for the order of the two operations, as the
        // conflict resolution depends on the random actor ids.
        expect.arrayContaining([slide0, slide4]),
      );
    });

    it('should handle user removing slide while another user is moving it', () => {
      aliceDoc.performChange(generateMoveSlide(slide0, 3));
      expect(getNormalizedSlideIds(aliceDoc.getData())).toEqual([
        slide1,
        slide2,
        slide3,
        slide0,
      ]);

      bobDoc.performChange(generateRemoveSlide(slide0));
      expect(getNormalizedSlideIds(bobDoc.getData())).toEqual([
        slide1,
        slide2,
        slide3,
      ]);

      bobDoc.mergeFrom(aliceDoc.store());
      expect(getNormalizedSlideIds(bobDoc.getData())).toEqual([
        slide1,
        slide2,
        slide3,
      ]);
    });

    it('should handle both users moving the same slide and then one user removing it', () => {
      aliceDoc.performChange(generateMoveSlide(slide1, 3));
      expect(getNormalizedSlideIds(aliceDoc.getData())).toEqual([
        slide0,
        slide2,
        slide3,
        slide1,
      ]);

      aliceDoc.performChange(generateMoveSlide(slide1, 0));
      bobDoc.performChange(generateRemoveSlide(slide1));
      expect(getNormalizedSlideIds(bobDoc.getData())).toEqual([
        slide0,
        slide2,
        slide3,
      ]);

      bobDoc.mergeFrom(aliceDoc.store());
      expect(getNormalizedSlideIds(bobDoc.getData())).toEqual([
        slide0,
        slide2,
        slide3,
      ]);
    });

    it('should cleanup conflicts on next move', () => {
      aliceDoc.performChange(generateMoveSlide(slide1, 3));
      expect(getNormalizedSlideIds(aliceDoc.getData())).toEqual([
        slide0,
        slide2,
        slide3,
        slide1,
      ]);

      bobDoc.performChange(generateMoveSlide(slide1, 3));
      expect(getNormalizedSlideIds(bobDoc.getData())).toEqual([
        slide0,
        slide2,
        slide3,
        slide1,
      ]);

      bobDoc.mergeFrom(aliceDoc.store());
      expect(getNormalizedSlideIds(bobDoc.getData())).toEqual([
        slide0,
        slide2,
        slide3,
        slide1,
      ]);

      bobDoc.performChange(generateMoveSlide(slide1, 0));
      expect(getNormalizedSlideIds(bobDoc.getData())).toEqual([
        slide1,
        slide0,
        slide2,
        slide3,
      ]);

      bobDoc.mergeFrom(aliceDoc.store());
      expect(getNormalizedSlideIds(bobDoc.getData())).toEqual([
        slide1,
        slide0,
        slide2,
        slide3,
      ]);
    });
  });
});

describe('generateRemoveSlide', () => {
  it('should remove slide', () => {
    const doc = createWhiteboardDocument();
    const [changeFn1, slide1] = generateAddSlide();
    doc.performChange(changeFn1);

    doc.performChange(generateRemoveSlide(slide0));

    expect(getNormalizedSlideIds(doc.getData())).toEqual([slide1]);
    expect(getSlide(doc.getData(), slide0)).toEqual(undefined);
  });

  describe('should handle conflicts while removing slides', () => {
    let aliceDoc: Document<WhiteboardDocument>;
    let bobDoc: Document<WhiteboardDocument>;
    let slide1: string;
    let slide2: string;
    let slide3: string;

    beforeEach(() => {
      aliceDoc = createWhiteboardDocument();

      const change1 = generateAddSlide();
      slide1 = change1[1];
      aliceDoc.performChange(change1[0]);
      const change2 = generateAddSlide();
      slide2 = change2[1];
      aliceDoc.performChange(change2[0]);
      const change3 = generateAddSlide();
      slide3 = change3[1];
      aliceDoc.performChange(change3[0]);

      bobDoc = createWhiteboardDocument();
      bobDoc.mergeFrom(aliceDoc.store());
    });

    it('should remove slide if two users remove the same slide', () => {
      aliceDoc.performChange(generateRemoveSlide(slide2));
      expect(getNormalizedSlideIds(aliceDoc.getData())).toEqual([
        slide0,
        slide1,
        slide3,
      ]);

      bobDoc.performChange(generateRemoveSlide(slide2));
      expect(getNormalizedSlideIds(bobDoc.getData())).toEqual([
        slide0,
        slide1,
        slide3,
      ]);

      bobDoc.mergeFrom(aliceDoc.store());
      expect(getNormalizedSlideIds(bobDoc.getData())).toEqual([
        slide0,
        slide1,
        slide3,
      ]);
    });

    it('should remove slides if two users remove different slides', () => {
      aliceDoc.performChange(generateRemoveSlide(slide2));
      expect(getNormalizedSlideIds(aliceDoc.getData())).toEqual([
        slide0,
        slide1,
        slide3,
      ]);

      bobDoc.performChange(generateRemoveSlide(slide1));
      expect(getNormalizedSlideIds(bobDoc.getData())).toEqual([
        slide0,
        slide2,
        slide3,
      ]);

      bobDoc.mergeFrom(aliceDoc.store());
      expect(getNormalizedSlideIds(bobDoc.getData())).toEqual([slide0, slide3]);
    });
  });
});

describe('generateLockSlide', () => {
  it('should lock the slide', () => {
    const document = createWhiteboardDocument();

    const lockSlide = generateLockSlide(slide0, '@user-id');
    document.performChange(lockSlide);

    expect(getSlide(document.getData(), slide0)?.toJSON()).toEqual({
      elements: {},
      elementIds: [],
      lock: { userId: '@user-id' },
    });
  });

  it('should ignore missing slide', () => {
    const document = createWhiteboardDocument();

    const lockSlide = generateLockSlide('not-exists', '@user-id');
    document.performChange(lockSlide);

    expect(document.getData().toJSON()).toEqual({
      slideIds: [slide0],
      slides: { [slide0]: { elements: {}, elementIds: [] } },
    });
  });

  it('should handle conflicting lock states', () => {
    const aliceDoc = createWhiteboardDocument();
    const bobDoc = createWhiteboardDocument();

    const aliceLockSlide = generateLockSlide(slide0, '@user-alice');
    aliceDoc.performChange(aliceLockSlide);

    const bobLockSlide = generateLockSlide(slide0, '@user-bob');
    bobDoc.performChange(bobLockSlide);

    bobDoc.mergeFrom(aliceDoc.store());
    aliceDoc.mergeFrom(bobDoc.store());

    // both will have the same result
    expect(getSlide(aliceDoc.getData(), slide0)?.toJSON().lock).toEqual(
      getSlide(bobDoc.getData(), slide0)?.toJSON().lock,
    );

    expect(getSlide(bobDoc.getData(), slide0)?.toJSON().lock).toEqual({
      // There is no guarantee for the order of the two operations, as the
      // conflict resolution depends on the random actor ids.
      userId: expect.stringMatching(/@user-(alice|bob)/),
    });
  });
});

describe('generateUnlockSlide', () => {
  it('should unlock the slide', () => {
    const document = createWhiteboardDocument();

    const lockSlide = generateLockSlide(slide0, '@user-id');
    document.performChange(lockSlide);
    expect(getSlide(document.getData(), slide0)?.toJSON().lock).toBeDefined();

    const unlockSlide = generateUnlockSlide(slide0);
    document.performChange(unlockSlide);

    expect(getSlide(document.getData(), slide0)?.toJSON()).toEqual({
      elements: {},
      elementIds: [],
    });
  });

  it('should ignore missing slide', () => {
    const document = createWhiteboardDocument();

    const unlockSlide = generateUnlockSlide('not-exists');
    document.performChange(unlockSlide);

    expect(document.getData().toJSON()).toEqual({
      slideIds: [slide0],
      slides: { [slide0]: { elements: {}, elementIds: [] } },
    });
  });
});

describe('getElement', () => {
  it('should return the element', () => {
    const document = createWhiteboardDocument();

    const element = mockLineElement();
    const [addElement, elementId] = generateAddElement(slide0, element);

    document.performChange(addElement);

    expect(getElement(document.getData(), slide0, elementId)?.toJSON()).toEqual(
      element,
    );
  });

  it('should return undefined if slide does not exist', () => {
    const document = createWhiteboardDocument();

    expect(
      getElement(document.getData(), 'not-exists', 'not-relevant'),
    ).toBeUndefined();
  });

  it('should return undefined if element does not exist', () => {
    const document = createWhiteboardDocument();

    expect(
      getElement(document.getData(), slide0, 'not-exists'),
    ).toBeUndefined();
  });
});

describe('getNormalizedElementIds', () => {
  it('should skip duplicate element ids', () => {
    const document = createWhiteboardDocument();

    const element = mockLineElement();
    const [addElement, elementId] = generateAddElement(slide0, element);

    document.performChange((doc) => {
      addElement(doc);
      getSlide(doc, slide0)?.get('elementIds').push([elementId]);
    });

    expect(getNormalizedElementIds(document.getData(), slide0)).toEqual([
      elementId,
    ]);
  });

  it('should skip deleted elements', () => {
    const document = createWhiteboardDocument();

    const element = mockLineElement();
    const [addElement, elementId] = generateAddElement(slide0, element);

    document.performChange((doc) => {
      addElement(doc);
      getSlide(doc, slide0)?.get('elements').delete(elementId);
    });

    expect(getNormalizedElementIds(document.getData(), slide0)).toEqual([]);
  });

  it('should handle a missing slide', () => {
    const document = createWhiteboardDocument();

    expect(getNormalizedElementIds(document.getData(), 'not-exists')).toEqual(
      [],
    );
  });
});

describe('generateAddElement', () => {
  it('should add element', () => {
    const doc = createWhiteboardDocument();

    const element = mockLineElement();
    const [changeFn, elementId] = generateAddElement(slide0, element);

    doc.performChange(changeFn);

    expect(elementId).toEqual(expect.any(String));
    expect(getElement(doc.getData(), slide0, elementId)?.toJSON()).toEqual(
      element,
    );
    expect(getNormalizedElementIds(doc.getData(), slide0)).toEqual([elementId]);
  });

  it('should add element with id', () => {
    const doc = createWhiteboardDocument();

    const element = mockLineElement();
    const [changeFn, elementId] = generateAddElement(
      slide0,
      element,
      'element-id-0',
    );

    doc.performChange(changeFn);

    expect(elementId).toEqual('element-id-0');
    expect(getElement(doc.getData(), slide0, elementId)?.toJSON()).toEqual(
      element,
    );
    expect(getNormalizedElementIds(doc.getData(), slide0)).toEqual([elementId]);
  });

  it('should throw if the slide does not exist', () => {
    const doc = createWhiteboardDocument();

    const element = mockLineElement();
    const [changeFn] = generateAddElement('not-exists', element);

    expect(() => doc.performChange(changeFn)).toThrow(
      'Slide not found: not-exists',
    );
  });
});

describe('generateAddElements', () => {
  it('should add elements', () => {
    const doc = createWhiteboardDocument();

    const element0 = mockEllipseElement();
    const element1 = mockLineElement();
    const [changeFn, elementIds] = generateAddElements(slide0, [
      element0,
      element1,
    ]);

    doc.performChange(changeFn);

    expect(elementIds).toEqual([expect.any(String), expect.any(String)]);
    expect(getElement(doc.getData(), slide0, elementIds[0])?.toJSON()).toEqual(
      element0,
    );
    expect(getElement(doc.getData(), slide0, elementIds[1])?.toJSON()).toEqual(
      element1,
    );
    expect(getNormalizedElementIds(doc.getData(), slide0)).toEqual(elementIds);
  });

  it('should throw if the slide does not exist', () => {
    const doc = createWhiteboardDocument();
    const [changeFn] = generateAddElements('not-exists', []);

    expect(() => doc.performChange(changeFn)).toThrow(
      'Slide not found: not-exists',
    );
  });
});

describe('generateMoveElement', () => {
  it('should reorder elements', () => {
    const doc = createWhiteboardDocument();

    const element = mockLineElement();
    const [changeFn0, element0] = generateAddElement(slide0, element);
    doc.performChange(changeFn0);
    const [changeFn1, element1] = generateAddElement(slide0, element);
    doc.performChange(changeFn1);
    const [changeFn2, element2] = generateAddElement(slide0, element);
    doc.performChange(changeFn2);
    const [changeFn3, element3] = generateAddElement(slide0, element);
    doc.performChange(changeFn3);

    doc.performChange(generateMoveElement(slide0, element1, 0));

    expect(getNormalizedElementIds(doc.getData(), slide0)).toEqual([
      element1,
      element0,
      element2,
      element3,
    ]);
  });

  it('should with a generated index', () => {
    const doc = createWhiteboardDocument();

    const element = mockLineElement();
    const [changeFn0, element0] = generateAddElement(slide0, element);
    doc.performChange(changeFn0);
    const [changeFn1, element1] = generateAddElement(slide0, element);
    doc.performChange(changeFn1);
    const [changeFn2, element2] = generateAddElement(slide0, element);
    doc.performChange(changeFn2);
    const [changeFn3, element3] = generateAddElement(slide0, element);
    doc.performChange(changeFn3);

    doc.performChange(
      generateMoveElement(
        slide0,
        element3,
        (elementIds, currentIndex) => elementIds.length % currentIndex, // 4 % 3 = 1
      ),
    );

    expect(getNormalizedElementIds(doc.getData(), slide0)).toEqual([
      element0,
      element3,
      element1,
      element2,
    ]);
  });

  it('should ignore missing element', () => {
    const doc = createWhiteboardDocument();

    const element = mockLineElement();
    const [changeFn0, element0] = generateAddElement(slide0, element);
    doc.performChange(changeFn0);
    const [changeFn1, element1] = generateAddElement(slide0, element);
    doc.performChange(changeFn1);

    doc.performChange(generateMoveElement(slide0, 'not-exists', 0));

    expect(getNormalizedElementIds(doc.getData(), slide0)).toEqual([
      element0,
      element1,
    ]);
  });

  it.each([-1, () => -1])('should ignore a negative index (%p)', (index) => {
    const doc = createWhiteboardDocument();

    const element = mockLineElement();
    const [changeFn0, element0] = generateAddElement(slide0, element);
    doc.performChange(changeFn0);
    const [changeFn1, element1] = generateAddElement(slide0, element);
    doc.performChange(changeFn1);
    const [changeFn2, element2] = generateAddElement(slide0, element);
    doc.performChange(changeFn2);
    const [changeFn3, element3] = generateAddElement(slide0, element);
    doc.performChange(changeFn3);

    doc.performChange(generateMoveElement(slide0, element2, index));

    expect(getNormalizedElementIds(doc.getData(), slide0)).toEqual([
      element0,
      element1,
      element2,
      element3,
    ]);
  });

  describe('should handle conflicts while reordering elements', () => {
    let aliceDoc: Document<WhiteboardDocument>;
    let bobDoc: Document<WhiteboardDocument>;
    let element0: string;
    let element1: string;
    let element2: string;
    let element3: string;

    beforeEach(() => {
      aliceDoc = createWhiteboardDocument();

      const element = mockLineElement();
      const change0 = generateAddElement(slide0, element);
      element0 = change0[1];
      aliceDoc.performChange(change0[0]);
      const change1 = generateAddElement(slide0, element);
      element1 = change1[1];
      aliceDoc.performChange(change1[0]);
      const change2 = generateAddElement(slide0, element);
      element2 = change2[1];
      aliceDoc.performChange(change2[0]);
      const change3 = generateAddElement(slide0, element);
      element3 = change3[1];
      aliceDoc.performChange(change3[0]);

      bobDoc = createWhiteboardDocument();
      bobDoc.mergeFrom(aliceDoc.store());
    });

    it('should handle two users moving the same element', () => {
      aliceDoc.performChange(generateMoveElement(slide0, element1, 0));

      expect(getNormalizedElementIds(aliceDoc.getData(), slide0)).toEqual([
        element1,
        element0,
        element2,
        element3,
      ]);

      bobDoc.performChange(generateMoveElement(slide0, element1, 0));
      expect(getNormalizedElementIds(bobDoc.getData(), slide0)).toEqual([
        element1,
        element0,
        element2,
        element3,
      ]);

      bobDoc.mergeFrom(aliceDoc.store());
      expect(getNormalizedElementIds(bobDoc.getData(), slide0)).toEqual([
        element1,
        element0,
        element2,
        element3,
      ]);
    });

    it('should handle two users moving different elements', () => {
      aliceDoc.performChange(generateMoveElement(slide0, element1, 0));
      expect(getNormalizedElementIds(aliceDoc.getData(), slide0)).toEqual([
        element1,
        element0,
        element2,
        element3,
      ]);

      bobDoc.performChange(generateMoveElement(slide0, element3, 0));
      expect(getNormalizedElementIds(bobDoc.getData(), slide0)).toEqual([
        element3,
        element0,
        element1,
        element2,
      ]);

      bobDoc.mergeFrom(aliceDoc.store());
      const bobElementIds = getNormalizedElementIds(bobDoc.getData(), slide0);
      expect(bobElementIds.slice(0, 2)).toEqual(
        // There is no guarantee for the order of the two operations, as the
        // conflict resolution depends on the random actor ids.
        expect.arrayContaining([element1, element3]),
      );
      expect(bobElementIds.slice(2)).toEqual([element0, element2]);
    });

    it('should handle user adding new element while another user is moving', () => {
      aliceDoc.performChange(generateMoveElement(slide0, element0, 3));
      expect(getNormalizedElementIds(aliceDoc.getData(), slide0)).toEqual([
        element1,
        element2,
        element3,
        element0,
      ]);

      const element = mockLineElement();
      const [changeFn4, element4] = generateAddElement(slide0, element);
      bobDoc.performChange(changeFn4);
      expect(getNormalizedElementIds(bobDoc.getData(), slide0)).toEqual([
        element0,
        element1,
        element2,
        element3,
        element4,
      ]);

      bobDoc.mergeFrom(aliceDoc.store());

      const bobElementIds = getNormalizedElementIds(bobDoc.getData(), slide0);
      expect(bobElementIds.slice(0, 3)).toEqual([element1, element2, element3]);
      expect(bobElementIds.slice(3)).toEqual(
        // There is no guarantee for the order of the two operations, as the
        // conflict resolution depends on the random actor ids.
        expect.arrayContaining([element0, element4]),
      );
    });

    it('should handle user removing element while another user is moving it', () => {
      aliceDoc.performChange(generateMoveElement(slide0, element0, 3));
      expect(getNormalizedElementIds(aliceDoc.getData(), slide0)).toEqual([
        element1,
        element2,
        element3,
        element0,
      ]);

      bobDoc.performChange(generateRemoveElement(slide0, element0));
      expect(getNormalizedElementIds(bobDoc.getData(), slide0)).toEqual([
        element1,
        element2,
        element3,
      ]);

      bobDoc.mergeFrom(aliceDoc.store());
      expect(getNormalizedElementIds(bobDoc.getData(), slide0)).toEqual([
        element1,
        element2,
        element3,
      ]);
    });

    it('should handle both users moving the same element and then one user removing it', () => {
      aliceDoc.performChange(generateMoveElement(slide0, element1, 3));
      expect(getNormalizedElementIds(aliceDoc.getData(), slide0)).toEqual([
        element0,
        element2,
        element3,
        element1,
      ]);

      aliceDoc.performChange(generateMoveElement(slide0, element1, 0));
      bobDoc.performChange(generateRemoveElement(slide0, element1));
      expect(getNormalizedElementIds(bobDoc.getData(), slide0)).toEqual([
        element0,
        element2,
        element3,
      ]);

      bobDoc.mergeFrom(aliceDoc.store());
      expect(getNormalizedElementIds(bobDoc.getData(), slide0)).toEqual([
        element0,
        element2,
        element3,
      ]);
    });

    it('should cleanup conflicts on next move', () => {
      aliceDoc.performChange(generateMoveElement(slide0, element1, 3));
      expect(getNormalizedElementIds(aliceDoc.getData(), slide0)).toEqual([
        element0,
        element2,
        element3,
        element1,
      ]);

      bobDoc.performChange(generateMoveElement(slide0, element1, 3));
      expect(getNormalizedElementIds(bobDoc.getData(), slide0)).toEqual([
        element0,
        element2,
        element3,
        element1,
      ]);

      bobDoc.mergeFrom(aliceDoc.store());
      expect(getNormalizedElementIds(bobDoc.getData(), slide0)).toEqual([
        element0,
        element2,
        element3,
        element1,
      ]);

      bobDoc.performChange(generateMoveElement(slide0, element1, 0));
      expect(getNormalizedElementIds(bobDoc.getData(), slide0)).toEqual([
        element1,
        element0,
        element2,
        element3,
      ]);

      bobDoc.mergeFrom(aliceDoc.store());
      expect(getNormalizedElementIds(bobDoc.getData(), slide0)).toEqual([
        element1,
        element0,
        element2,
        element3,
      ]);
    });
  });
});

describe('generateMoveElements', () => {
  it('should move element to the beginning of the list', () => {
    const doc = createWhiteboardDocument();

    const element = mockLineElement();
    const [changeFn0, element0] = generateAddElement(slide0, element);
    doc.performChange(changeFn0);
    const [changeFn1, element1] = generateAddElement(slide0, element);
    doc.performChange(changeFn1);
    const [changeFn2, element2] = generateAddElement(slide0, element);
    doc.performChange(changeFn2);
    const [changeFn3, element3] = generateAddElement(slide0, element);
    doc.performChange(changeFn3);

    doc.performChange(generateMoveElements(slide0, [element1], 'bottom'));

    expect(getNormalizedElementIds(doc.getData(), slide0)).toEqual([
      element1,
      element0,
      element2,
      element3,
    ]);
  });

  it('should move elements to the beginning of the list', () => {
    const doc = createWhiteboardDocument();

    const element = mockLineElement();
    const [changeFn0, element0] = generateAddElement(slide0, element);
    doc.performChange(changeFn0);
    const [changeFn1, element1] = generateAddElement(slide0, element);
    doc.performChange(changeFn1);
    const [changeFn2, element2] = generateAddElement(slide0, element);
    doc.performChange(changeFn2);
    const [changeFn3, element3] = generateAddElement(slide0, element);
    doc.performChange(changeFn3);

    doc.performChange(
      generateMoveElements(slide0, [element1, element2], 'bottom'),
    );

    expect(getNormalizedElementIds(doc.getData(), slide0)).toEqual([
      element2,
      element1,
      element0,
      element3,
    ]);
  });

  it('should move element to the end of the list', () => {
    const doc = createWhiteboardDocument();

    const element = mockLineElement();
    const [changeFn0, element0] = generateAddElement(slide0, element);
    doc.performChange(changeFn0);
    const [changeFn1, element1] = generateAddElement(slide0, element);
    doc.performChange(changeFn1);
    const [changeFn2, element2] = generateAddElement(slide0, element);
    doc.performChange(changeFn2);
    const [changeFn3, element3] = generateAddElement(slide0, element);
    doc.performChange(changeFn3);

    doc.performChange(generateMoveElements(slide0, [element1], 'top'));

    expect(getNormalizedElementIds(doc.getData(), slide0)).toEqual([
      element0,
      element2,
      element3,
      element1,
    ]);
  });

  it('should move elements to the end of the list', () => {
    const doc = createWhiteboardDocument();

    const element = mockLineElement();
    const [changeFn0, element0] = generateAddElement(slide0, element);
    doc.performChange(changeFn0);
    const [changeFn1, element1] = generateAddElement(slide0, element);
    doc.performChange(changeFn1);
    const [changeFn2, element2] = generateAddElement(slide0, element);
    doc.performChange(changeFn2);
    const [changeFn3, element3] = generateAddElement(slide0, element);
    doc.performChange(changeFn3);

    doc.performChange(
      generateMoveElements(slide0, [element1, element2], 'top'),
    );

    expect(getNormalizedElementIds(doc.getData(), slide0)).toEqual([
      element0,
      element3,
      element1,
      element2,
    ]);
  });
});

describe('generateMoveUp', () => {
  it('should move element one to the end of the list', () => {
    const doc = createWhiteboardDocument();

    const element = mockLineElement();
    const [changeFn0, element0] = generateAddElement(slide0, element);
    doc.performChange(changeFn0);
    const [changeFn1, element1] = generateAddElement(slide0, element);
    doc.performChange(changeFn1);
    const [changeFn2, element2] = generateAddElement(slide0, element);
    doc.performChange(changeFn2);
    const [changeFn3, element3] = generateAddElement(slide0, element);
    doc.performChange(changeFn3);

    doc.performChange(generateMoveUp(slide0, element1));

    expect(getNormalizedElementIds(doc.getData(), slide0)).toEqual([
      element0,
      element2,
      element1,
      element3,
    ]);
  });
});

describe('generateMoveDown', () => {
  it('should move element one to the beginning of the list', () => {
    const doc = createWhiteboardDocument();

    const element = mockLineElement();
    const [changeFn0, element0] = generateAddElement(slide0, element);
    doc.performChange(changeFn0);
    const [changeFn1, element1] = generateAddElement(slide0, element);
    doc.performChange(changeFn1);
    const [changeFn2, element2] = generateAddElement(slide0, element);
    doc.performChange(changeFn2);
    const [changeFn3, element3] = generateAddElement(slide0, element);
    doc.performChange(changeFn3);

    doc.performChange(generateMoveDown(slide0, element2));

    expect(getNormalizedElementIds(doc.getData(), slide0)).toEqual([
      element0,
      element2,
      element1,
      element3,
    ]);
  });
});

describe('generateUpdateElement', () => {
  it('should update an element', () => {
    const doc = createWhiteboardDocument();

    const element = mockLineElement();
    const [changeFn0, element0] = generateAddElement(slide0, element);
    doc.performChange(changeFn0);
    const [changeFn1, element1] = generateAddElement(slide0, element);
    doc.performChange(changeFn1);

    doc.performChange(
      generateUpdateElement(slide0, element1, {
        strokeColor: '#000000',
      }),
    );

    expect(getSlide(doc.getData(), slide0)?.toJSON()).toEqual({
      elementIds: [element0, element1],
      elements: {
        [element0]: element,
        [element1]: {
          ...element,
          strokeColor: '#000000',
        },
      },
    });
  });

  describe('should handle conflicts while updating element', () => {
    let aliceDoc: Document<WhiteboardDocument>;
    let bobDoc: Document<WhiteboardDocument>;
    let element1: string;

    beforeEach(() => {
      aliceDoc = createWhiteboardDocument();

      const element = mockLineElement();
      const change0 = generateAddElement(slide0, element);
      aliceDoc.performChange(change0[0]);
      const change1 = generateAddElement(slide0, element);
      element1 = change1[1];
      aliceDoc.performChange(change1[0]);

      bobDoc = createWhiteboardDocument();
      bobDoc.mergeFrom(aliceDoc.store());
    });

    it('should handle two users updating the same element property', () => {
      const element = mockLineElement();

      aliceDoc.performChange(
        generateUpdateElement(slide0, element1, { strokeColor: 'red' }),
      );
      expect(
        getElement(aliceDoc.getData(), slide0, element1)?.toJSON(),
      ).toEqual({
        ...element,
        strokeColor: 'red',
      });

      bobDoc.performChange(
        generateUpdateElement(slide0, element1, { strokeColor: 'red' }),
      );
      expect(getElement(bobDoc.getData(), slide0, element1)?.toJSON()).toEqual({
        ...element,
        strokeColor: 'red',
      });

      bobDoc.mergeFrom(aliceDoc.store());
      expect(getElement(bobDoc.getData(), slide0, element1)?.toJSON()).toEqual({
        ...element,
        strokeColor: 'red',
      });
    });

    it('should handle two users updating different element properties', () => {
      const element = mockLineElement();

      aliceDoc.performChange(
        generateUpdateElement(slide0, element1, { strokeColor: 'red' }),
      );
      expect(
        getElement(aliceDoc.getData(), slide0, element1)?.toJSON(),
      ).toEqual({
        ...element,
        strokeColor: 'red',
      });

      bobDoc.performChange(
        generateUpdateElement(slide0, element1, { position: { x: 4, y: 3 } }),
      );
      expect(getElement(bobDoc.getData(), slide0, element1)?.toJSON()).toEqual({
        ...element,
        position: { x: 4, y: 3 },
      });

      bobDoc.mergeFrom(aliceDoc.store());
      expect(getElement(bobDoc.getData(), slide0, element1)?.toJSON()).toEqual({
        ...element,
        strokeColor: 'red',
        position: { x: 4, y: 3 },
      });
    });

    it('should handle user removing element while another user is editing it', () => {
      const element = mockLineElement();

      aliceDoc.performChange(
        generateUpdateElement(slide0, element1, { strokeColor: 'red' }),
      );
      expect(
        getElement(aliceDoc.getData(), slide0, element1)?.toJSON(),
      ).toEqual({
        ...element,
        strokeColor: 'red',
      });

      bobDoc.performChange(generateRemoveElement(slide0, element1));
      expect(
        getElement(bobDoc.getData(), slide0, element1)?.toJSON(),
      ).toBeUndefined();

      bobDoc.mergeFrom(aliceDoc.store());
      expect(
        getElement(bobDoc.getData(), slide0, element1)?.toJSON(),
      ).toBeUndefined();
    });
  });
});

describe('generateRemoveElement', () => {
  it('should remove element', () => {
    const doc = createWhiteboardDocument();
    const element = mockLineElement();
    const [changeFn0, element0] = generateAddElement(slide0, element);
    doc.performChange(changeFn0);
    const [changeFn1, element1] = generateAddElement(slide0, element);
    doc.performChange(changeFn1);

    doc.performChange(generateRemoveElement(slide0, element0));

    expect(getNormalizedElementIds(doc.getData(), slide0)).toEqual([element1]);
    expect(getElement(doc.getData(), slide0, element0)).toBeUndefined();
  });

  describe('should handle conflicts while removing elements', () => {
    let aliceDoc: Document<WhiteboardDocument>;
    let bobDoc: Document<WhiteboardDocument>;
    let element0: string;
    let element1: string;
    let element2: string;
    let element3: string;

    beforeEach(() => {
      aliceDoc = createWhiteboardDocument();

      const element = mockLineElement();
      const change0 = generateAddElement(slide0, element);
      element0 = change0[1];
      aliceDoc.performChange(change0[0]);
      const change1 = generateAddElement(slide0, element);
      element1 = change1[1];
      aliceDoc.performChange(change1[0]);
      const change2 = generateAddElement(slide0, element);
      element2 = change2[1];
      aliceDoc.performChange(change2[0]);
      const change3 = generateAddElement(slide0, element);
      element3 = change3[1];
      aliceDoc.performChange(change3[0]);

      bobDoc = createWhiteboardDocument();
      bobDoc.mergeFrom(aliceDoc.store());
    });

    it('should remove element if two users remove the same element', () => {
      aliceDoc.performChange(generateRemoveElement(slide0, element2));
      expect(getNormalizedElementIds(aliceDoc.getData(), slide0)).toEqual([
        element0,
        element1,
        element3,
      ]);

      bobDoc.performChange(generateRemoveElement(slide0, element2));
      expect(getNormalizedElementIds(bobDoc.getData(), slide0)).toEqual([
        element0,
        element1,
        element3,
      ]);

      bobDoc.mergeFrom(aliceDoc.store());
      expect(getNormalizedElementIds(bobDoc.getData(), slide0)).toEqual([
        element0,
        element1,
        element3,
      ]);
    });

    it('should remove element if two users remove different elements', () => {
      aliceDoc.performChange(generateRemoveElement(slide0, element2));
      expect(getNormalizedElementIds(aliceDoc.getData(), slide0)).toEqual([
        element0,
        element1,
        element3,
      ]);

      bobDoc.performChange(generateRemoveElement(slide0, element1));
      expect(getNormalizedElementIds(bobDoc.getData(), slide0)).toEqual([
        element0,
        element2,
        element3,
      ]);

      bobDoc.mergeFrom(aliceDoc.store());
      expect(getNormalizedElementIds(bobDoc.getData(), slide0)).toEqual([
        element0,
        element3,
      ]);
    });
  });
});

describe('generateRemoveElements', () => {
  it('should remove the elements', () => {
    const doc = createWhiteboardDocument();
    const element = mockLineElement();
    const [changeFn0, element0] = generateAddElement(slide0, element);
    doc.performChange(changeFn0);
    const [changeFn1, element1] = generateAddElement(slide0, element);
    doc.performChange(changeFn1);
    const [changeFn2, element2] = generateAddElement(slide0, element);
    doc.performChange(changeFn2);

    doc.performChange(generateRemoveElements(slide0, [element0, element1]));

    expect(getNormalizedElementIds(doc.getData(), slide0)).toEqual([element2]);
    expect(getElement(doc.getData(), slide0, element0)).toBeUndefined();
    expect(getElement(doc.getData(), slide0, element1)).toBeUndefined();
  });
});

describe('generate', () => {
  it('should generate change to apply several changes', () => {
    const document = createWhiteboardDocument();

    const element = mockLineElement();
    const [addElement, elementId] = generateAddElement(slide0, element);
    const updateElement = generateUpdateElement(slide0, elementId, {
      strokeColor: '#000000',
    });

    document.performChange(generate([addElement, updateElement]));

    expect(getElement(document.getData(), slide0, elementId)?.toJSON()).toEqual(
      {
        ...element,
        strokeColor: '#000000',
      },
    );
  });
});
