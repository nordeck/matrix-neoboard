/*
 * Copyright 2024 Nordeck IT + Consulting GmbH
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

import { readFile } from 'node:fs/promises';
import { join } from 'path';

const readFileAsFile = async (original_path: string): Promise<File> => {
  // Get image type from file ending.
  const type = original_path.split('.').pop();
  // convert to mime type.
  let mime;
  if (type === 'jpg') {
    mime = 'image/jpeg';
  } else if (type === 'png') {
    mime = 'image/png';
  } else if (type === 'gif') {
    mime = 'image/gif';
  }

  // Add `test_files` to the path.
  const fullPath = join('test_files', original_path);
  // Convert to real path.
  const path = new URL(fullPath, import.meta.url).pathname;
  const file = await readFile(path);
  const fileObj = new File([file.buffer], original_path, { type: mime });
  // This is required since jsdom doesnt support it.
  fileObj.arrayBuffer = async () => file.buffer;
  return fileObj;
};

export { readFileAsFile };
