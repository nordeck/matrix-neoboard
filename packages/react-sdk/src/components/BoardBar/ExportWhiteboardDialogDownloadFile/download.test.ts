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

import { Blob as BlobPolyfill } from 'node:buffer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { download, downloadData } from './download';

describe('download', () => {
  let anchorElement: HTMLAnchorElement;
  let OriginalBlob: Blob;

  beforeEach(async () => {
    // @ts-ignore polyfill Blob with Node.Js Blob
    OriginalBlob = Blob;
    Object.assign(global, {
      Blob: BlobPolyfill,
    });

    const createElement = document.createElement.bind(document);

    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      const element = createElement(tag);

      if (element instanceof HTMLAnchorElement) {
        // This is used below in the expect statements.
        vi.spyOn(element, 'click');
        vi.spyOn(element, 'remove');
        vi.spyOn(element, 'setAttribute');
        anchorElement = element;
      }

      return element;
    });

    vi.spyOn(document.body, 'appendChild');
  });

  afterEach(() => {
    Object.assign(global, {
      Blob: OriginalBlob,
    });

    vi.spyOn(document, 'createElement').mockRestore();
    vi.spyOn(document.body, 'appendChild').mockRestore();

    // mocked in setupTests - but reset here to not interfere with any other test
    vi.spyOn(URL, 'createObjectURL').mockReset();
    vi.spyOn(URL, 'revokeObjectURL').mockReset();
  });

  it('should start a download', () => {
    download('example.txt', 'https://example.com/example.txt');

    expect(document.body.appendChild).toHaveBeenCalledWith(anchorElement);
    expect(anchorElement.href).toEqual('https://example.com/example.txt');
    expect(anchorElement.download).toEqual('example.txt');
    expect(anchorElement.target).toEqual('_blank');
    expect(anchorElement.click).toHaveBeenCalled();
    expect(anchorElement.remove).toHaveBeenCalled();
  });

  describe('downloadData', () => {
    it('should start a JSON download', async () => {
      vi.mocked(URL.createObjectURL).mockReturnValue(
        'blob:https://example.com/example.txt',
      );

      const spy = vi.spyOn(URL, 'createObjectURL');
      downloadData('example.json', { test: 23 });
      const blob = spy.mock.calls?.[0][0] as Blob;
      await expect(blob.text()).resolves.toEqual('{"test":23}');
      expect(anchorElement.href).toEqual(
        'blob:https://example.com/example.txt',
      );
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(
        'blob:https://example.com/example.txt',
      );
    });
  });
});
