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
import { SharedMap } from './types';

/** A change function for a migration.
 *
 * There is a limited amount of possibilities for migrations. Migrations can
 * only:
 *
 * - Add new fields and initialize them to a constant value
 * - Remove fields
 *
 * They can not:
 * - Initialize fields based on values of the document itself (otherwise they
 *   can't be constant).
 * - Change the value of fields (otherwise they can't be constant)
 */
export type MigrationFn<T extends Record<string, unknown>> = (
  doc: SharedMap<T>
) => void;

export function createMigrations<T extends Record<string, unknown>>(
  migrationFns: MigrationFn<T>[],
  version: string
): Uint8Array[] {
  const doc = new Y.Doc();
  // Don't change the hardcoded clientID, as it makes sure that the
  // changes used for migrations are always equal byte-by-byte.
  doc.clientID = 0;
  // We only need a single top level map and use a nested map to structure our
  // data. This has the advantage that we can delete parts, because top level
  // structures can not be deleted.
  // The key of the single top level structure can be selected arbitrarily, but
  // we choose to go with a version that helps us the identify the version of a
  // document. Versioning documents should be avoided though and only be used
  // for breaking changes!
  const root = doc.getMap(version) as SharedMap<T>;

  return migrationFns.map((migrationFn) => {
    const beforeStateVector = Y.encodeStateVector(doc);
    doc.transact(() => migrationFn(root));
    const currentState = Y.encodeStateAsUpdate(doc);
    return Y.diffUpdate(currentState, beforeStateVector);
  });
}

export function applyMigrations(doc: Y.Doc, migrations: Uint8Array[]): void {
  for (const migration of migrations) {
    Y.applyUpdate(doc, migration);
  }
}
