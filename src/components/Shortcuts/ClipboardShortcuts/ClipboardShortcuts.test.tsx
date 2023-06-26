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

import { MockedWidgetApi, mockWidgetApi } from '@matrix-widget-toolkit/testing';
import { fireEvent, render } from '@testing-library/react';
import { ComponentType, PropsWithChildren } from 'react';
import {
  mockEllipseElement,
  mockLineElement,
  mockWhiteboardManager,
  WhiteboardTestingContextProvider,
} from '../../../lib/testUtils/documentTestUtils';
import { WhiteboardInstance, WhiteboardManager } from '../../../state';
import {
  HOTKEY_SCOPE_WHITEBOARD,
  usePauseHotkeysScope,
  WhiteboardHotkeysProvider,
} from '../../WhiteboardHotkeysProvider';
import { ClipboardShortcuts } from './ClipboardShortcuts';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => (widgetApi = mockWidgetApi()));

describe('<CopyAndPasteShortcuts>', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let whiteboardManager: jest.Mocked<WhiteboardManager>;
  let activeWhiteboardInstance: WhiteboardInstance;
  let setPresentationMode: (enable: boolean) => void;

  beforeEach(() => {
    ({ whiteboardManager, setPresentationMode } = mockWhiteboardManager({
      slides: [
        [
          'slide-0',
          [
            ['element-0', mockLineElement()],
            ['element-1', mockEllipseElement({ text: 'Hello World' })],
          ],
        ],
      ],
    }));
    activeWhiteboardInstance = whiteboardManager.getActiveWhiteboardInstance()!;

    const activeSlide = activeWhiteboardInstance.getSlide('slide-0');
    activeSlide.setActiveElementIds(['element-1']);

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

  it('should copy content', () => {
    render(<ClipboardShortcuts />, { wrapper: Wrapper });

    const clipboardData = fireClipboardEvent('copy');

    expect(clipboardData.setData).toBeCalledWith('text/plain', 'Hello World');
    expect(clipboardData.setData).toBeCalledWith(
      'text/html',
      expect.stringContaining('<span data-meta=')
    );
  });

  it('should ignore copy if no element is selected', () => {
    const activeSlide = activeWhiteboardInstance.getSlide('slide-0');
    activeSlide.setActiveElementIds([]);

    render(<ClipboardShortcuts />, { wrapper: Wrapper });

    const clipboardData = fireClipboardEvent('copy');

    expect(clipboardData.setData).not.toBeCalled();
  });

  it('should ignore copy if keyboard scope is disabled', () => {
    render(
      <DisableWhiteboardHotkeys>
        <ClipboardShortcuts />
      </DisableWhiteboardHotkeys>,
      { wrapper: Wrapper }
    );

    const clipboardData = fireClipboardEvent('copy');

    expect(clipboardData.setData).not.toBeCalled();
  });

  it('should ignore copy if the presentation mode is active', () => {
    setPresentationMode(true);

    render(<ClipboardShortcuts />, { wrapper: Wrapper });

    const clipboardData = fireClipboardEvent('copy');

    expect(clipboardData.setData).not.toBeCalled();
  });

  it('should cut content', () => {
    const activeSlide = activeWhiteboardInstance.getSlide('slide-0');

    render(<ClipboardShortcuts />, { wrapper: Wrapper });

    const clipboardData = fireClipboardEvent('cut');

    expect(clipboardData.setData).toBeCalledWith('text/plain', 'Hello World');
    expect(clipboardData.setData).toBeCalledWith(
      'text/html',
      expect.stringContaining('<span data-meta=')
    );

    expect(activeSlide.getActiveElementIds()).toEqual([]);
    expect(activeSlide.getElement('element-1')).toBeUndefined();
  });

  it('should ignore cut if slide is locked', () => {
    const activeSlide = activeWhiteboardInstance.getSlide('slide-0');
    activeSlide.lockSlide();

    render(<ClipboardShortcuts />, { wrapper: Wrapper });

    const clipboardData = fireClipboardEvent('cut');

    expect(clipboardData.setData).not.toBeCalled();
  });

  it('should ignore cut if no element is selected', () => {
    const activeSlide = activeWhiteboardInstance.getSlide('slide-0');
    activeSlide.setActiveElementIds([]);

    render(<ClipboardShortcuts />, { wrapper: Wrapper });

    const clipboardData = fireClipboardEvent('cut');

    expect(clipboardData.setData).not.toBeCalled();
  });

  it('should ignore cut if keyboard scope is disabled', () => {
    render(
      <DisableWhiteboardHotkeys>
        <ClipboardShortcuts />
      </DisableWhiteboardHotkeys>,
      { wrapper: Wrapper }
    );

    const clipboardData = fireClipboardEvent('cut');

    expect(clipboardData.setData).not.toBeCalled();
  });

  it('should ignore cut if the presentation mode is active', () => {
    setPresentationMode(true);

    render(<ClipboardShortcuts />, { wrapper: Wrapper });

    const clipboardData = fireClipboardEvent('cut');

    expect(clipboardData.setData).not.toBeCalled();
  });

  it('should paste content', () => {
    const activeSlide = activeWhiteboardInstance.getSlide('slide-0');

    render(<ClipboardShortcuts />, { wrapper: Wrapper });

    fireClipboardEvent('paste', {
      'text/plain': 'Bye Bye',
      'text/html': '<span>Invalid HTML</span>',
    });

    const activeElementIds = activeSlide.getActiveElementIds();
    expect(activeElementIds).not.toEqual(['element-1']);
    const activeElement = activeSlide.getElement(activeElementIds[0]);
    expect(activeElement).toEqual({
      fillColor: '#FFFFFF',
      height: 300,
      kind: 'rectangle',
      position: {
        x: 660,
        y: 390,
      },
      text: 'Bye Bye',
      type: 'shape',
      width: 600,
    });
  });

  it('should ignore paste if slide is locked', () => {
    const activeSlide = activeWhiteboardInstance.getSlide('slide-0');
    activeSlide.lockSlide();

    render(<ClipboardShortcuts />, { wrapper: Wrapper });

    const clipboardData = fireClipboardEvent('paste', {
      'text/plain': 'Bye Bye',
    });

    expect(clipboardData.getData).not.toBeCalled();
  });

  it('should ignore paste if keyboard scope is disabled', () => {
    render(
      <DisableWhiteboardHotkeys>
        <ClipboardShortcuts />
      </DisableWhiteboardHotkeys>,
      { wrapper: Wrapper }
    );

    const clipboardData = fireClipboardEvent('paste', {
      'text/plain': 'Bye Bye',
    });

    expect(clipboardData.getData).not.toBeCalled();
  });

  it('should ignore paste if the presentation mode is active', () => {
    setPresentationMode(true);

    render(<ClipboardShortcuts />, { wrapper: Wrapper });

    const clipboardData = fireClipboardEvent('paste', {
      'text/plain': 'Bye Bye',
    });

    expect(clipboardData.getData).not.toBeCalled();
  });
});

type Writeable<T> = { -readonly [P in keyof T]: T[P] };

function fireClipboardEvent(
  eventType: 'copy' | 'cut' | 'paste',
  data: Record<string, string> = {}
): Partial<jest.Mocked<DataTransfer>> {
  const clipboardData = {
    getData: jest.fn((type) => data[type]),
    setData: jest.fn(),
  };
  const event = new Event(eventType) as Writeable<ClipboardEvent>;
  event.clipboardData = clipboardData as unknown as DataTransfer;

  fireEvent(document, event);

  return clipboardData;
}

function DisableWhiteboardHotkeys({ children }: PropsWithChildren<{}>) {
  usePauseHotkeysScope(HOTKEY_SCOPE_WHITEBOARD);
  return <>{children}</>;
}
