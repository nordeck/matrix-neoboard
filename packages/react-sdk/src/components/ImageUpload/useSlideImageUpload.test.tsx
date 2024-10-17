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
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentType, PropsWithChildren } from 'react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  MockInstance,
  vi,
} from 'vitest';
import {
  mockWhiteboardManager,
  WhiteboardTestingContextProvider,
} from '../../lib/testUtils/documentTestUtils';
import { WhiteboardSlideInstance } from '../../state';
import { SnackbarProvider } from '../Snackbar';
import { ImageUploadProvider } from './ImageUploadProvider';
import { useSlideImageUpload } from './useSlideImageUpload';

vi.mock('../../lib', async () => ({
  ...(await vi.importActual<typeof import('../../lib')>('../../lib')),
  determineImageSize: () => {
    // Always return a static value here, because js-dom doesn't implement Image.
    return Promise.resolve({ width: 40, height: 20 });
  },
}));

function TestFileInput() {
  const { getInputProps } = useSlideImageUpload();
  return <input data-testid="file-input" {...getInputProps()} />;
}

describe('useSlideImageUpload', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let widgetApi: MockedWidgetApi;
  let slide: WhiteboardSlideInstance;
  let consoleSpy: MockInstance<typeof console.error>;

  beforeEach(() => {
    widgetApi = mockWidgetApi();
    const { whiteboardManager } = mockWhiteboardManager({
      slides: [['slide-0', []]],
    });
    const whiteboard = whiteboardManager.getActiveWhiteboardInstance()!;
    slide = whiteboard.getSlide(whiteboard.getActiveSlideId()!);
    consoleSpy = vi.spyOn(console, 'error');

    Wrapper = ({ children }) => {
      return (
        <SnackbarProvider>
          <WhiteboardTestingContextProvider
            whiteboardManager={whiteboardManager}
            widgetApi={widgetApi}
          >
            <ImageUploadProvider>{children}</ImageUploadProvider>
          </WhiteboardTestingContextProvider>
        </SnackbarProvider>
      );
    };
  });

  afterEach(() => {
    widgetApi.stop();
    consoleSpy.mockRestore();
  });

  it('should add an uploaded image to the slide', async () => {
    render(<TestFileInput />, { wrapper: Wrapper });

    const file = new File([], 'example.jpg', {
      type: 'image/jpeg',
    });
    await userEvent.upload(screen.getByTestId('file-input'), file);

    await waitFor(() => {
      expect(slide.getElementIds().length).toBe(1);
    });

    const imageElement = slide.getElement(slide.getElementIds()[0]);
    expect(imageElement?.type).toBe('image');
  });

  it('should not explode if there is an upload error', async () => {
    consoleSpy.mockImplementation(() => {});
    render(<TestFileInput />, { wrapper: Wrapper });

    const file = new File([], 'example.jpg', {
      type: 'image/jpeg',
    });
    const uploadError = new Error('upload error');
    vi.spyOn(file, 'arrayBuffer').mockImplementation(() => {
      throw uploadError;
    });
    await userEvent.upload(screen.getByTestId('file-input'), file);

    expect(console.error).toHaveBeenCalledWith(
      'Error uploading an image',
      uploadError,
    );
    expect(slide.getElementIds().length).toBe(0);
  });
});
