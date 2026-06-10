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

import * as Y from 'yjs';

/**
 * Gets a document version from Y doc update message data.
 * A document version is the key of the single top level structure of Y doc constructed from update.
 * @param data update message data
 * @returns a document version or undefined
 */
export function getYDocUpdateDocumentVersion(
  data: Uint8Array,
): string | undefined {
  const doc = new Y.Doc();

  try {
    Y.applyUpdate(doc, data);
  } catch {
    return undefined;
  }

  const iter = doc.share.keys();

  const key = iter.next();
  const keyValue = key.value;

  const nextKey = iter.next();

  return keyValue && nextKey.done ? keyValue : undefined;
}
