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

import { MockedWidgetApi, mockWidgetApi } from '@matrix-widget-toolkit/testing';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentType, PropsWithChildren } from 'react';
import { Mocked, afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  WhiteboardTestingContextProvider,
  mockWhiteboardManager,
} from '../../../lib/testUtils/documentTestUtils';
import { WhiteboardInstance, WhiteboardManager } from '../../../state';
import { WhiteboardHotkeysProvider } from '../../WhiteboardHotkeysProvider';
import { PresentationShortcuts } from './PresentationShortcuts';

describe('PresentationShortcuts', () => {
  let widgetApi: MockedWidgetApi;
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let whiteboardManager: Mocked<WhiteboardManager>;
  let activeWhiteboardInstance: WhiteboardInstance;

  beforeEach(() => {
    widgetApi = mockWidgetApi();
    ({ whiteboardManager } = mockWhiteboardManager({
      slides: [
        ['slide-0', []],
        ['slide-1', []],
        ['slide-2', []],
      ],
    }));
    activeWhiteboardInstance = whiteboardManager.getActiveWhiteboardInstance()!;
    activeWhiteboardInstance.setActiveSlideId('slide-1');

    Wrapper = ({ children }) => (
      <WhiteboardHotkeysProvider>
        <WhiteboardTestingContextProvider
          whiteboardManager={whiteboardManager}
          widgetApi={widgetApi}
        >
          {children}
        </WhiteboardTestingContextProvider>
      </WhiteboardHotkeysProvider>
    );
  });

  afterEach(() => {
    widgetApi.stop();
  });

  it.each([['ArrowLeft'], ['ArrowRight'], [' ']])(
    'when not presenting, it should not change the slide with the %s key',
    async (key) => {
      render(<PresentationShortcuts />, { wrapper: Wrapper });

      await userEvent.keyboard(key);

      expect(activeWhiteboardInstance.getActiveSlideId()).toBe('slide-1');
    },
  );

  it('when presenting, it should change the slides by arrow keys and space', async () => {
    activeWhiteboardInstance.getPresentationManager().startPresentation();
    render(<PresentationShortcuts />, { wrapper: Wrapper });

    // Navigate forward with right arrow key
    await userEvent.keyboard('{arrowright}');
    expect(activeWhiteboardInstance.getActiveSlideId()).toBe('slide-2');

    // End of presentation, pressing the arrow right key should not change the slide
    await userEvent.keyboard('{arrowright}');
    expect(activeWhiteboardInstance.getActiveSlideId()).toBe('slide-2');

    // Navigate back with the arrow left key
    await userEvent.keyboard('{arrowleft}');
    expect(activeWhiteboardInstance.getActiveSlideId()).toBe('slide-1');
    await userEvent.keyboard('{arrowleft}');
    expect(activeWhiteboardInstance.getActiveSlideId()).toBe('slide-0');

    // Start of presentation, pressing the arrow left key should not change the slide
    await userEvent.keyboard('{arrowleft}');
    expect(activeWhiteboardInstance.getActiveSlideId()).toBe('slide-0');

    // Navigate forward with space key
    await userEvent.keyboard(' ');
    expect(activeWhiteboardInstance.getActiveSlideId()).toBe('slide-1');
  });
});
