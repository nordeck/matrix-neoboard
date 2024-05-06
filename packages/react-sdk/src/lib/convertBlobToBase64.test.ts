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

import { convertBlobToBase64 } from './convertBlobToBase64';

describe('convertBlobToBase64', () => {
  let fileReader: FileReader;

  beforeEach(() => {
    fileReader = new FileReader();
    jest.spyOn(fileReader, 'readAsDataURL');
    jest.spyOn(global, 'FileReader').mockImplementation(() => {
      return fileReader;
    });
  });

  afterEach(() => {
    jest.mocked(FileReader).mockRestore();
  });

  it('should convert a blob to base64', async () => {
    const blob = new Blob(['test data']);
    const encoded = await convertBlobToBase64(blob);
    expect(encoded).toEqual(btoa('test data'));
  });

  it('should handle non-string results', async () => {
    jest.mocked(fileReader.readAsDataURL).mockImplementation(() => {
      // do not set the result and emit "loadend" to run into the non-string result case
      fileReader.dispatchEvent(new Event('loadend'));
    });
    const blob = new Blob();

    await expect(convertBlobToBase64(blob)).rejects.toEqual(
      'Got non string data URL',
    );
  });
});
