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

import * as Y from 'yjs';
import { applyMigrations, createMigrations } from './migrations';
import { SharedMap } from './types';

type Example = {
  num: number;
  text?: Y.Text;
  list: Y.Array<string>;
};

function initMigration(doc: SharedMap<Example>) {
  doc.set('num', 5);
  doc.set('text', new Y.Text());
}

function migrateToList(doc: SharedMap<Example>) {
  doc.set('list', new Y.Array<string>());
  doc.delete('text');
}

describe('createMigrations', () => {
  it('should create stable binary represetation of migrations', () => {
    const migrations = createMigrations([initMigration, migrateToList], '1');

    expect(migrations).toEqual([
      new Uint8Array([
        1, 2, 0, 0, 40, 1, 1, 49, 3, 110, 117, 109, 1, 125, 5, 39, 1, 1, 49, 4,
        116, 101, 120, 116, 2, 0,
      ]),
      new Uint8Array([
        1, 1, 0, 2, 39, 1, 1, 49, 4, 108, 105, 115, 116, 0, 1, 0, 1, 1, 1,
      ]),
    ]);
  });
});

describe('applyMigrations', () => {
  it('should apply initial migration', () => {
    const doc = new Y.Doc();
    applyMigrations(doc, createMigrations([initMigration], '1'));
    const root = doc.getMap('1');

    expect(root.toJSON()).toEqual({
      num: 5,
      text: '',
    });
  });

  it('should apply multiple migrations', () => {
    const doc = new Y.Doc();
    applyMigrations(doc, createMigrations([initMigration], '0'));
    const root = doc.getMap('0') as SharedMap<Example>;

    doc.transact(() => {
      root.set('num', 10);
      root.get('text')?.insert(0, 'HELLO');
    });

    applyMigrations(doc, createMigrations([initMigration, migrateToList], '0'));

    expect(root.toJSON()).toEqual({
      num: 10,
      list: [],
    });
  });

  it('should allow to merge two documents that got migrations applied separately', () => {
    const aliceDoc = new Y.Doc();
    const bobDoc = new Y.Doc();

    applyMigrations(aliceDoc, createMigrations([initMigration], '0'));
    applyMigrations(bobDoc, createMigrations([initMigration], '0'));

    const aliceRoot = aliceDoc.getMap('0') as SharedMap<Example>;

    aliceDoc.transact(() => {
      aliceRoot.set('num', 10);
      aliceRoot.get('text')?.insert(0, 'WORLD');
    });

    applyMigrations(
      aliceDoc,
      createMigrations([initMigration, migrateToList], '0'),
    );

    applyMigrations(
      bobDoc,
      createMigrations([initMigration, migrateToList], '0'),
    );

    const bobRoot = aliceDoc.getMap('0') as SharedMap<Example>;

    bobDoc.transact(() => {
      bobRoot.set('num', 6);
      bobRoot.get('list')?.insert(0, ['Hello World']);
    });

    const mergedDoc = new Y.Doc();
    Y.applyUpdate(mergedDoc, Y.encodeStateAsUpdate(aliceDoc));
    Y.applyUpdate(mergedDoc, Y.encodeStateAsUpdate(bobDoc));
    const mergedRoot = mergedDoc.getMap('0');

    expect(mergedRoot.toJSON()).toEqual({
      num: 6,
      list: ['Hello World'],
    });
  });
});
