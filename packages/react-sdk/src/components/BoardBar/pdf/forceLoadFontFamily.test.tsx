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

import { forceLoadFontFamily } from './forceLoadFontFamily';

describe('forceLoadFontFamily', () => {
  it('should wait until the fonts were loaded', async () => {
    const loadMyFont = jest.fn().mockResolvedValue(undefined);
    const loadOtherFont = jest.fn();

    Object.defineProperty(document, 'fonts', {
      value: {
        ready: Promise.resolve([
          { family: 'My Font', load: loadMyFont, variant: 'normal' },
          { family: 'My Font', load: loadMyFont, variant: 'bold' },
          { family: 'Other Font', load: loadOtherFont },
        ]),
      },
    });

    expect(await forceLoadFontFamily('My Font')).toBeUndefined();

    expect(loadMyFont).toHaveBeenCalledTimes(2);
    expect(loadOtherFont).not.toHaveBeenCalled();
  });
});
