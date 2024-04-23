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

import { download } from './download';

describe('download', () => {
  let downloadElement: HTMLAnchorElement;

  beforeEach(() => {
    jest.spyOn(document.body, 'appendChild');

    const originalCreateElement = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tag) => {
      const htmlElement = originalCreateElement(tag);
      jest.spyOn(htmlElement, 'click');
      jest.spyOn(htmlElement, 'remove');

      if (htmlElement instanceof HTMLAnchorElement) {
        downloadElement = htmlElement;
      }

      return htmlElement;
    });
  });

  afterEach(() => {
    jest.mocked(document.body.appendChild).mockRestore();
    jest.mocked(document.createElement).mockRestore();
  });

  it('should trigger a download', () => {
    download('https://example.com/', 'example.file', '_blank');

    expect(document.body.appendChild).toHaveBeenCalledWith(downloadElement);
    expect(downloadElement.target).toBe('_blank');
    expect(downloadElement.download).toBe('example.file');
    expect(downloadElement.click).toHaveBeenCalled();
    expect(downloadElement.remove).toHaveBeenCalled();
  });
});
