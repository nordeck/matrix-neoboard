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

import { render } from '@testing-library/react';
import { HotkeyHelp, HotkeysHelp } from './HotkeysHelp';

describe('<HotkeysHelp>', () => {
  it('should render without exploding', () => {
    const { container } = render(<HotkeysHelp keys={['CTRL+s', 'META+s']} />);

    expect(container.textContent).toBe('Ctrl+S | ⌘+S');
  });
});

describe('<HotkeyHelp>', () => {
  it('should render without exploding', () => {
    const { container } = render(<HotkeyHelp keys="CTRL+s" />);

    expect(container.textContent).toBe('Ctrl+S');
  });
});
