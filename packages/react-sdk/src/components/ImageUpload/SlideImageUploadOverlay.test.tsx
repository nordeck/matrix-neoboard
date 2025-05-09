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
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentType, PropsWithChildren } from 'react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  Mock,
  MockInstance,
  vi,
} from 'vitest';
import {
  mockWhiteboardManager,
  WhiteboardTestingContextProvider,
} from '../../lib/testUtils/documentTestUtils';
import { WhiteboardSlideInstance } from '../../state';
import { ImageUploadProvider } from '../ImageUpload';
import { SnackbarProvider } from '../Snackbar';
import { whiteboardHeight, whiteboardWidth } from '../Whiteboard';
import {
  SvgCanvasContextType,
  SvgCanvasMockProvider,
} from '../Whiteboard/SvgCanvas';
import { SlideImageUploadOverlay } from './SlideImageUploadOverlay';
import { readFileAsFile } from './imageTestUtils';

vi.mock('../../lib/determineImageSize', async () => ({
  determineImageSize: () => {
    // Always return a static value here, because js-dom doesn't implement Image.
    return Promise.resolve({ width: 40, height: 20 });
  },
}));

describe('SlideImageUploadOverlay', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let widgetApi: MockedWidgetApi;
  let slide: WhiteboardSlideInstance;
  let handleDragLeave: Mock;
  let consoleSpy: MockInstance<typeof console.error>;

  beforeEach(() => {
    widgetApi = mockWidgetApi();
    const { whiteboardManager } = mockWhiteboardManager({
      slides: [['slide-0', []]],
    });
    const whiteboard = whiteboardManager.getActiveWhiteboardInstance()!;
    slide = whiteboard.getSlide(whiteboard.getActiveSlideId()!);
    consoleSpy = vi.spyOn(console, 'error');

    const value: SvgCanvasContextType = {
      width: 100,
      height: 100,
      viewportWidth: whiteboardWidth,
      viewportHeight: whiteboardHeight,
      calculateSvgCoords: vi.fn(),
    };
    handleDragLeave = vi.fn();

    Wrapper = () => {
      return (
        <SnackbarProvider>
          <WhiteboardTestingContextProvider
            whiteboardManager={whiteboardManager}
            widgetApi={widgetApi}
          >
            <ImageUploadProvider>
              <SvgCanvasMockProvider value={value}>
                <SlideImageUploadOverlay onDragLeave={handleDragLeave} />
              </SvgCanvasMockProvider>
            </ImageUploadProvider>
          </WhiteboardTestingContextProvider>
        </SnackbarProvider>
      );
    };
  });

  afterEach(() => {
    widgetApi.stop();
    consoleSpy.mockRestore();
  });

  it('should upload a file on drop', async () => {
    render(<></>, { wrapper: Wrapper });

    const file = await readFileAsFile('nordeck.jpg');

    // Use upload instead of drop. Drop does not seem to work in the test environment.
    await userEvent.upload(
      screen.getByTestId('slide-image-upload-overlay-input'),
      file,
    );

    await waitFor(() => {
      expect(slide.getElementIds().length).toBe(1);
    });

    const imageElement = slide.getElement(slide.getElementIds()[0]);
    expect(imageElement?.type).toBe('image');
  });

  it('should call drag leave on drag leave', () => {
    render(<></>, { wrapper: Wrapper });

    fireEvent.dragLeave(screen.getByTestId('slide-image-upload-overlay'));

    expect(handleDragLeave).toHaveBeenCalled();
  });
});
