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
  mockWhiteboardManager,
  WhiteboardTestingContextProvider,
} from '../../lib/testUtils/documentTestUtils';
import { WhiteboardSlideInstance } from '../../state';
import { ImageUploadProvider } from '../ImageUpload';
import { SnackbarProvider } from '../Snackbar';
import { SlideImageUploadOverlay } from './SlideImageUploadOverlay';

jest.mock('../../lib', () => ({
  ...jest.requireActual('../../lib'),
  determineImageSize: () => {
    // Always return a static value here, because js-dom doesn't implement Image.
    return Promise.resolve({ width: 40, height: 20 });
  },
}));

describe('SlideImageUploadOverlay', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let widgetApi: MockedWidgetApi;
  let slide: WhiteboardSlideInstance;
  let handleDragLeave: jest.Mock;

  beforeEach(() => {
    widgetApi = mockWidgetApi();
    const { whiteboardManager } = mockWhiteboardManager({
      slides: [['slide-0', []]],
    });
    const whiteboard = whiteboardManager.getActiveWhiteboardInstance()!;
    slide = whiteboard.getSlide(whiteboard.getActiveSlideId()!);
    jest.spyOn(console, 'error');

    handleDragLeave = jest.fn();

    Wrapper = () => {
      return (
        <SnackbarProvider>
          <WhiteboardTestingContextProvider
            whiteboardManager={whiteboardManager}
            widgetApi={widgetApi}
          >
            <ImageUploadProvider>
              <SlideImageUploadOverlay onDragLeave={handleDragLeave} />
            </ImageUploadProvider>
          </WhiteboardTestingContextProvider>
        </SnackbarProvider>
      );
    };
  });

  afterEach(() => {
    widgetApi.stop();
    jest.mocked(console.error).mockRestore();
  });

  it('should upload a file on drop', async () => {
    render(<></>, { wrapper: Wrapper });

    const file = new File([], 'example.jpg', {
      type: 'image/jpeg',
    });

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
