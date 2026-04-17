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
import { ComponentType, PropsWithChildren, useEffect } from 'react';
import {
  Mocked,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  WhiteboardTestingContextProvider,
  mockEllipseElement,
  mockFrameElement,
  mockLineElement,
  mockRectangleElement,
  mockWhiteboardManager,
} from '../../../lib/testUtils';
import {
  FrameElement,
  WhiteboardInstance,
  WhiteboardManager,
  WhiteboardSlideInstance,
} from '../../../state';
import { ImageUploadProvider } from '../../ImageUpload';
import { SnackbarProvider } from '../../Snackbar';
import { useSvgScaleContext } from '../../Whiteboard';
import {
  HOTKEY_SCOPE_WHITEBOARD,
  WhiteboardHotkeysProvider,
  usePauseHotkeysScope,
} from '../../WhiteboardHotkeysProvider';
import { ClipboardShortcuts } from './ClipboardShortcuts';
import { deserializeFromHtml, serializeToClipboard } from './serialization';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => {
  widgetApi = mockWidgetApi();
});

describe('<CopyAndPasteShortcuts>', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let whiteboardManager: Mocked<WhiteboardManager>;
  let activeWhiteboardInstance: WhiteboardInstance;
  let activeSlide: WhiteboardSlideInstance;
  let setPresentationMode: (enable: boolean) => void;

  beforeEach(() => {
    ({ whiteboardManager, setPresentationMode } = mockWhiteboardManager({
      slides: [
        [
          'slide-0',
          [
            ['element-0', mockLineElement()],
            ['element-1', mockEllipseElement({ text: 'Hello World 1' })],
            ['element-2', mockEllipseElement({ text: 'Hello World 2' })],
            [
              'frame-0',
              mockFrameElement({
                position: { x: 500, y: 500 },
                width: 300,
                height: 300,
              }),
            ],
          ],
        ],
      ],
    }));
    activeWhiteboardInstance = whiteboardManager.getActiveWhiteboardInstance()!;

    activeSlide = activeWhiteboardInstance.getSlide('slide-0');
    // The reverse selection order of the element is by purpose.
    // Copy/cut should copy in the order of the elements on the board instead.
    activeSlide.setActiveElementIds(['element-2', 'element-1']);

    function SvgCanvasMock() {
      const { setContainerDimensions } = useSvgScaleContext();

      // set container dimensions as SvgCanvas does to have scale, translation applied
      useEffect(() => {
        setContainerDimensions({ width: 960, height: 540 });
      }, [setContainerDimensions]);

      return null;
    }

    Wrapper = ({ children }) => (
      <WhiteboardHotkeysProvider>
        <WhiteboardTestingContextProvider
          whiteboardManager={whiteboardManager}
          widgetApi={widgetApi}
        >
          <SnackbarProvider>
            <ImageUploadProvider>
              <SvgCanvasMock />
              {children}
            </ImageUploadProvider>
          </SnackbarProvider>
        </WhiteboardTestingContextProvider>
      </WhiteboardHotkeysProvider>
    );
  });

  it('should copy contents', () => {
    render(<ClipboardShortcuts />, { wrapper: Wrapper });

    const clipboardData = fireClipboardEvent('copy');

    expect(clipboardData.setData).toHaveBeenCalledWith(
      'text/plain',
      'Hello World 1 Hello World 2',
    );
    expect(clipboardData.setData).toHaveBeenCalledWith(
      'text/html',
      expect.stringContaining('<span data-meta='),
    );
    expect(clipboardData.getData('text/plain')).toEqual(
      'Hello World 1 Hello World 2',
    );
    expect(clipboardData.getData('text/html')).toContain('<span data-meta=');
    expect(
      Object.entries(
        deserializeFromHtml(clipboardData.getData('text/html')).elements ?? {},
      ),
    ).toEqual([
      [
        'element-1',
        {
          type: 'shape',
          kind: 'ellipse',
          position: { x: 0, y: 1 },
          fillColor: '#ffffff',
          textFontFamily: 'Inter',
          height: 100,
          width: 50,
          text: 'Hello World 1',
        },
      ],
      [
        'element-2',
        {
          type: 'shape',
          kind: 'ellipse',
          position: { x: 0, y: 1 },
          fillColor: '#ffffff',
          textFontFamily: 'Inter',
          height: 100,
          width: 50,
          text: 'Hello World 2',
        },
      ],
    ]);
  });

  it('should copy frame element', () => {
    activeSlide.setActiveElementIds(['frame-0']);

    render(<ClipboardShortcuts />, { wrapper: Wrapper });

    const clipboardData = fireClipboardEvent('copy');

    expect(clipboardData.getData('text/plain')).toEqual('');
    expect(deserializeFromHtml(clipboardData.getData('text/html'))).toEqual({
      elements: {
        'frame-0': {
          type: 'frame',
          position: { x: 500, y: 500 },
          width: 300,
          height: 300,
        },
      },
    });
  });

  it.each([
    ['only frame is selected', ['frame-0']],
    ['frame with attached element is selected', ['frame-0', 'element-1']],
  ])(
    'should copy frame when it has elements attached and %s keeping elements in the document order',
    (_testName, activeElementIds) => {
      activeSlide.updateElements([
        {
          elementId: 'frame-0',
          patch: {
            attachedElements: ['element-1'],
          },
        },
        {
          elementId: 'element-1',
          patch: {
            attachedFrame: 'frame-0',
          },
        },
      ]);

      activeSlide.setActiveElementIds(activeElementIds);

      render(<ClipboardShortcuts />, { wrapper: Wrapper });

      const clipboardData = fireClipboardEvent('copy');

      expect(clipboardData.getData('text/plain')).toEqual('Hello World 1');
      expect(
        Object.entries(
          deserializeFromHtml(clipboardData.getData('text/html')).elements ??
            {},
        ),
      ).toEqual([
        [
          'element-1',
          {
            type: 'shape',
            kind: 'ellipse',
            position: { x: 0, y: 1 },
            fillColor: '#ffffff',
            textFontFamily: 'Inter',
            height: 100,
            width: 50,
            text: 'Hello World 1',
            attachedFrame: 'frame-0',
          },
        ],
        [
          'frame-0',
          {
            type: 'frame',
            position: { x: 500, y: 500 },
            width: 300,
            height: 300,
            attachedElements: ['element-1'],
          },
        ],
      ]);
    },
  );

  it('should ignore copy if no element is selected', () => {
    const activeSlide = activeWhiteboardInstance.getSlide('slide-0');
    activeSlide.setActiveElementId(undefined);

    render(<ClipboardShortcuts />, { wrapper: Wrapper });

    const clipboardData = fireClipboardEvent('copy');

    expect(clipboardData.setData).not.toHaveBeenCalled();
  });

  it('should ignore copy if keyboard scope is disabled', () => {
    render(
      <DisableWhiteboardHotkeys>
        <ClipboardShortcuts />
      </DisableWhiteboardHotkeys>,
      { wrapper: Wrapper },
    );

    const clipboardData = fireClipboardEvent('copy');

    expect(clipboardData.setData).not.toHaveBeenCalled();
  });

  it('should ignore copy if the presentation mode is active', () => {
    setPresentationMode(true);

    render(<ClipboardShortcuts />, { wrapper: Wrapper });

    const clipboardData = fireClipboardEvent('copy');

    expect(clipboardData.setData).not.toHaveBeenCalled();
  });

  it('should cut contents', () => {
    const activeSlide = activeWhiteboardInstance.getSlide('slide-0');

    render(<ClipboardShortcuts />, { wrapper: Wrapper });

    const clipboardData = fireClipboardEvent('cut');

    expect(clipboardData.setData).toHaveBeenCalledWith(
      'text/plain',
      'Hello World 1 Hello World 2',
    );
    expect(clipboardData.setData).toHaveBeenCalledWith(
      'text/html',
      expect.stringContaining('<span data-meta='),
    );
    expect(clipboardData.getData('text/plain')).toEqual(
      'Hello World 1 Hello World 2',
    );
    expect(clipboardData.getData('text/html')).toContain('<span data-meta=');
    expect(
      Object.entries(
        deserializeFromHtml(clipboardData.getData('text/html')).elements ?? {},
      ),
    ).toEqual([
      [
        'element-1',
        {
          type: 'shape',
          kind: 'ellipse',
          position: { x: 0, y: 1 },
          fillColor: '#ffffff',
          textFontFamily: 'Inter',
          height: 100,
          width: 50,
          text: 'Hello World 1',
        },
      ],
      [
        'element-2',
        {
          type: 'shape',
          kind: 'ellipse',
          position: { x: 0, y: 1 },
          fillColor: '#ffffff',
          textFontFamily: 'Inter',
          height: 100,
          width: 50,
          text: 'Hello World 2',
        },
      ],
    ]);

    expect(activeSlide.getActiveElementIds()).toEqual([]);
    expect(activeSlide.getElements(['element-1', 'element-2'])).toEqual({});
  });

  it.each([
    ['only frame is selected', ['frame-0']],
    ['frame with attached element is selected', ['frame-0', 'element-1']],
  ])(
    'should cut frame when it has elements attached and %s keeping elements in the document order',
    (_testName, activeElementIds) => {
      activeSlide.updateElements([
        {
          elementId: 'frame-0',
          patch: {
            attachedElements: ['element-1'],
          },
        },
        {
          elementId: 'element-1',
          patch: {
            attachedFrame: 'frame-0',
          },
        },
      ]);

      activeSlide.setActiveElementIds(activeElementIds);

      render(<ClipboardShortcuts />, { wrapper: Wrapper });

      const clipboardData = fireClipboardEvent('cut');

      expect(clipboardData.getData('text/plain')).toEqual('Hello World 1');
      expect(
        Object.entries(
          deserializeFromHtml(clipboardData.getData('text/html')).elements ??
            {},
        ),
      ).toEqual([
        [
          'element-1',
          {
            type: 'shape',
            kind: 'ellipse',
            position: { x: 0, y: 1 },
            fillColor: '#ffffff',
            textFontFamily: 'Inter',
            height: 100,
            width: 50,
            text: 'Hello World 1',
            attachedFrame: 'frame-0',
          },
        ],
        [
          'frame-0',
          {
            type: 'frame',
            position: { x: 500, y: 500 },
            width: 300,
            height: 300,
            attachedElements: ['element-1'],
          },
        ],
      ]);

      expect(activeSlide.getActiveElementIds()).toEqual([]);
      // explicitly pass frame and element id as both have to be removed from document in any test case
      expect(activeSlide.getElements(['frame-0', 'element-1'])).toEqual({});
    },
  );

  it('should ignore cut if slide is locked', () => {
    const activeSlide = activeWhiteboardInstance.getSlide('slide-0');
    activeSlide.lockSlide();

    render(<ClipboardShortcuts />, { wrapper: Wrapper });

    const clipboardData = fireClipboardEvent('cut');

    expect(clipboardData.setData).not.toHaveBeenCalled();
  });

  it('should ignore cut if no element is selected', () => {
    const activeSlide = activeWhiteboardInstance.getSlide('slide-0');
    activeSlide.setActiveElementId(undefined);

    render(<ClipboardShortcuts />, { wrapper: Wrapper });

    const clipboardData = fireClipboardEvent('cut');

    expect(clipboardData.setData).not.toHaveBeenCalled();
  });

  it('should ignore cut if keyboard scope is disabled', () => {
    render(
      <DisableWhiteboardHotkeys>
        <ClipboardShortcuts />
      </DisableWhiteboardHotkeys>,
      { wrapper: Wrapper },
    );

    const clipboardData = fireClipboardEvent('cut');

    expect(clipboardData.setData).not.toHaveBeenCalled();
  });

  it('should ignore cut if the presentation mode is active', () => {
    setPresentationMode(true);

    render(<ClipboardShortcuts />, { wrapper: Wrapper });

    const clipboardData = fireClipboardEvent('cut');

    expect(clipboardData.setData).not.toHaveBeenCalled();
  });

  it('should paste content to viewport center', () => {
    const activeSlide = activeWhiteboardInstance.getSlide('slide-0');

    render(<ClipboardShortcuts />, { wrapper: Wrapper });

    fireClipboardEvent('paste', {
      'text/plain': 'Bye Bye',
      'text/html': '<span>Invalid HTML</span>',
    });

    const activeElementIds = activeSlide.getActiveElementIds();
    expect(activeElementIds.length).toBe(1);
    const activeElementId = activeElementIds[0];
    expect(activeElementId).not.toBe('element-1');
    const activeElement = activeSlide.getElement(activeElementId!);
    expect(activeElement).toEqual({
      fillColor: 'transparent',
      textFontFamily: 'Inter',
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

  it('should paste element to viewport center', () => {
    const activeSlide = activeWhiteboardInstance.getSlide('slide-0');

    render(<ClipboardShortcuts />, { wrapper: Wrapper });

    fireClipboardEvent(
      'paste',
      serializeToClipboard({
        elements: {
          ['element-id-0']: mockRectangleElement({ width: 600, height: 300 }),
        },
      }),
    );

    const activeElementIds = activeSlide.getActiveElementIds();
    expect(activeElementIds.length).toBe(1);
    const activeElementId = activeElementIds[0];
    expect(activeElementId).not.toBe('element-1');
    const activeElement = activeSlide.getElement(activeElementId!);
    expect(activeElement).toEqual({
      fillColor: '#ffffff',
      textFontFamily: 'Inter',
      height: 300,
      kind: 'rectangle',
      position: {
        x: 660,
        y: 390,
      },
      text: '',
      type: 'shape',
      width: 600,
    });
    expect(activeSlide.getElement('element-id-0')).toBeUndefined();
  });

  it('should paste element to cursor position', () => {
    const activeSlide = activeWhiteboardInstance.getSlide('slide-0');
    activeSlide.setCursorPosition({ x: 400, y: 200 });

    render(<ClipboardShortcuts />, { wrapper: Wrapper });

    fireClipboardEvent(
      'paste',
      serializeToClipboard({
        elements: {
          ['element-id-0']: mockRectangleElement({ width: 600, height: 300 }),
        },
      }),
    );

    const activeElementIds = activeSlide.getActiveElementIds();
    expect(activeElementIds.length).toBe(1);
    const activeElementId = activeElementIds[0];
    expect(activeElementId).not.toBe('element-1');
    const activeElement = activeSlide.getElement(activeElementId!);
    expect(activeElement).toEqual({
      fillColor: '#ffffff',
      textFontFamily: 'Inter',
      height: 300,
      kind: 'rectangle',
      position: {
        x: 100,
        y: 50,
      },
      text: '',
      type: 'shape',
      width: 600,
    });
    expect(activeSlide.getElement('element-id-0')).toBeUndefined();
  });

  it('should paste element to frame', () => {
    const activeSlide = activeWhiteboardInstance.getSlide('slide-0');
    activeSlide.setCursorPosition({ x: 600, y: 600 });

    render(<ClipboardShortcuts />, { wrapper: Wrapper });

    fireClipboardEvent(
      'paste',
      serializeToClipboard({
        elements: {
          ['element-id-0']: mockRectangleElement({ width: 100, height: 100 }),
        },
      }),
    );

    const activeElementIds = activeSlide.getActiveElementIds();
    expect(activeElementIds.length).toBe(1);
    const activeElementId = activeElementIds[0];
    expect(activeElementId).not.toBe('element-1');
    const activeElement = activeSlide.getElement(activeElementId!);
    expect(activeElement).toEqual({
      fillColor: '#ffffff',
      textFontFamily: 'Inter',
      height: 100,
      kind: 'rectangle',
      position: {
        x: 550,
        y: 550,
      },
      text: '',
      type: 'shape',
      width: 100,
      attachedFrame: 'frame-0',
    });
    const frameElement = activeSlide.getElement('frame-0');
    expect(frameElement).toEqual(
      expect.objectContaining({
        attachedElements: [activeElementId],
      }),
    );
    expect(activeSlide.getElement('element-id-0')).toBeUndefined();
  });

  it('should paste frame and attached element', () => {
    const activeSlide = activeWhiteboardInstance.getSlide('slide-0');
    activeSlide.setCursorPosition({ x: 600, y: 600 });

    render(<ClipboardShortcuts />, { wrapper: Wrapper });

    fireClipboardEvent(
      'paste',
      serializeToClipboard({
        elements: {
          'frame-id-1': mockFrameElement({
            position: { x: 0, y: 0 },
            width: 100,
            height: 100,
            attachedElements: ['element-id-0'],
          }),
          'element-id-0': mockRectangleElement({
            position: { x: 0, y: 0 },
            width: 100,
            height: 100,
            attachedFrame: 'frame-id-1',
          }),
        },
      }),
    );

    const [pastedFrameElementId, elementId] = activeSlide.getActiveElementIds();
    const pastedFrame = activeSlide.getElement(pastedFrameElementId);
    expect(pastedFrame).toEqual({
      type: 'frame',
      position: {
        x: 550,
        y: 550,
      },
      width: 100,
      height: 100,
      attachedElements: [elementId],
    });
    const element = activeSlide.getElement(elementId);
    expect(element).toEqual({
      fillColor: '#ffffff',
      textFontFamily: 'Inter',
      height: 100,
      kind: 'rectangle',
      position: {
        x: 550,
        y: 550,
      },
      text: '',
      type: 'shape',
      width: 100,
      attachedFrame: pastedFrameElementId,
    });
    expect(
      activeSlide.sortElementIds([elementId, pastedFrameElementId]),
    ).toEqual([pastedFrameElementId, elementId]);

    expect(activeSlide.getFrameElementIds()).toEqual([
      'frame-0',
      pastedFrameElementId,
    ]);

    const frameElement = activeSlide.getElement('frame-0');
    expect((frameElement as FrameElement).attachedElements).toBeUndefined();
    expect(activeSlide.getElement('element-id-0')).toBeUndefined();
  });

  it('should paste element that is attached to unknown frame', () => {
    const activeSlide = activeWhiteboardInstance.getSlide('slide-0');
    // explicitly set the cursor position to be outside of any existing frame
    activeSlide.setCursorPosition({ x: 0, y: 0 });

    render(<ClipboardShortcuts />, { wrapper: Wrapper });

    fireClipboardEvent(
      'paste',
      serializeToClipboard({
        elements: {
          'element-id-0': mockRectangleElement({
            position: { x: 0, y: 0 },
            width: 100,
            height: 100,
            attachedFrame: 'frame-id-1',
          }),
        },
      }),
    );

    const [elementId] = activeSlide.getActiveElementIds();
    const element = activeSlide.getElement(elementId);
    expect(element).toEqual({
      fillColor: '#ffffff',
      textFontFamily: 'Inter',
      height: 100,
      kind: 'rectangle',
      position: {
        x: 0,
        y: 0,
      },
      text: '',
      type: 'shape',
      width: 100,
    });

    const frameElement = activeSlide.getElement('frame-0');
    expect((frameElement as FrameElement).attachedElements).toBeUndefined();
    expect(activeSlide.getElement('element-id-0')).toBeUndefined();
  });

  it('should paste content to cursor position', () => {
    const activeSlide = activeWhiteboardInstance.getSlide('slide-0');
    activeSlide.setCursorPosition({ x: 400, y: 200 });

    render(<ClipboardShortcuts />, { wrapper: Wrapper });

    fireClipboardEvent('paste', {
      'text/plain': 'Bye Bye',
      'text/html': '<span>Invalid HTML</span>',
    });

    const activeElementIds = activeSlide.getActiveElementIds();
    expect(activeElementIds.length).toBe(1);
    const activeElementId = activeElementIds[0];
    expect(activeElementId).not.toBe('element-1');
    const activeElement = activeSlide.getElement(activeElementId!);
    expect(activeElement).toEqual({
      fillColor: 'transparent',
      textFontFamily: 'Inter',
      height: 300,
      kind: 'rectangle',
      position: {
        x: 100,
        y: 50,
      },
      text: 'Bye Bye',
      type: 'shape',
      width: 600,
    });
  });

  it('should paste content to cursor position and keep within canvas', () => {
    const activeSlide = activeWhiteboardInstance.getSlide('slide-0');
    activeSlide.setCursorPosition({ x: 100, y: 50 });

    render(<ClipboardShortcuts />, { wrapper: Wrapper });

    fireClipboardEvent('paste', {
      'text/plain': 'Bye Bye',
      'text/html': '<span>Invalid HTML</span>',
    });

    const activeElementIds = activeSlide.getActiveElementIds();
    expect(activeElementIds.length).toBe(1);
    const activeElementId = activeElementIds[0];
    expect(activeElementId).not.toBe('element-1');
    const activeElement = activeSlide.getElement(activeElementId!);
    expect(activeElement).toEqual({
      fillColor: 'transparent',
      textFontFamily: 'Inter',
      height: 300,
      kind: 'rectangle',
      position: {
        x: 0,
        y: 0,
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

    expect(clipboardData.getData).not.toHaveBeenCalled();
  });

  it('should ignore paste if keyboard scope is disabled', () => {
    render(
      <DisableWhiteboardHotkeys>
        <ClipboardShortcuts />
      </DisableWhiteboardHotkeys>,
      { wrapper: Wrapper },
    );

    const clipboardData = fireClipboardEvent('paste', {
      'text/plain': 'Bye Bye',
    });

    expect(clipboardData.getData).not.toHaveBeenCalled();
  });

  it('should ignore paste if the presentation mode is active', () => {
    setPresentationMode(true);

    render(<ClipboardShortcuts />, { wrapper: Wrapper });

    const clipboardData = fireClipboardEvent('paste', {
      'text/plain': 'Bye Bye',
    });

    expect(clipboardData.getData).not.toHaveBeenCalled();
  });
});

type Writeable<T> = { -readonly [P in keyof T]: T[P] };

function fireClipboardEvent(
  eventType: 'copy' | 'cut' | 'paste',
  data: Record<string, string> = {},
): Pick<Mocked<DataTransfer>, 'getData' | 'setData'> {
  const setData: Record<string, string> = {};
  const clipboardData = {
    getData: vi.fn((type) => setData[type] ?? data[type]),
    setData: vi.fn((type, data) => {
      setData[type] = data;
    }),
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
