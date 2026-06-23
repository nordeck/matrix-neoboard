/*
 * Copyright 2026 Nordeck IT + Consulting GmbH
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
import * as Y from 'yjs';
import { createMigrations } from './migrations';
import { SharedMap, YText } from './types';
import { getYDocUpdateDocumentVersion } from './utils';
import { YDocument } from './yDocument';

type Example = {
  num: number;
  text: YText;
};

function initMigration(doc: SharedMap<Example>) {
  doc.set('num', 5);
  doc.set('text', new Y.Text());
}

const exampleMigrations = createMigrations([initMigration], '0');

describe('getYDocUpdateDocumentVersion', () => {
  it('should get a document version from YDocument update', () => {
    const yDocument = YDocument.create<Example>(exampleMigrations, '0');
    const updateData = yDocument.store();
    expect(getYDocUpdateDocumentVersion(updateData)).toBe('0');
  });

  it('should get a document version from Y doc update', () => {
    const yDoc = new Y.Doc();
    const root0 = yDoc.getMap('0') as SharedMap<Example>;
    root0.set('num', 0);
    const updateData = Y.encodeStateAsUpdate(yDoc);
    expect(getYDocUpdateDocumentVersion(updateData)).toBe('0');
  });

  it('should return undefined for empty Y doc', () => {
    const yDoc = new Y.Doc();
    const snapshotData = Y.encodeStateAsUpdate(yDoc);
    expect(getYDocUpdateDocumentVersion(snapshotData)).toBeUndefined();
  });

  it('should return undefined for Y doc update with several top level maps', () => {
    const yDoc = new Y.Doc();
    const root0 = yDoc.getMap('0') as SharedMap<Example>;
    root0.set('num', 0);
    const root1 = yDoc.getMap('1') as SharedMap<Example>;
    root1.set('num', 1);
    const snapshotData = Y.encodeStateAsUpdate(yDoc);
    expect(getYDocUpdateDocumentVersion(snapshotData)).toBeUndefined();
  });

  it('should return undefined for invalid Y doc update', () => {
    const yDocument = YDocument.create<Example>(exampleMigrations, '0');
    const snapshotData = yDocument.store().subarray(0, 10);
    expect(getYDocUpdateDocumentVersion(snapshotData)).toBeUndefined();
  });
});
