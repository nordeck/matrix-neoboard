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

import { WidgetApiMockProvider } from '@matrix-widget-toolkit/react';
import { MockedWidgetApi, mockWidgetApi } from '@matrix-widget-toolkit/testing';
import { SnackbarProps } from '@mui/material';
import { renderHook, waitFor } from '@testing-library/react';
import { IUploadFileActionFromWidgetResponseData } from 'matrix-widget-api';
import { act, ComponentType, PropsWithChildren } from 'react';
import { ErrorCode, FileRejection } from 'react-dropzone';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  MockInstance,
  vi,
} from 'vitest';
import { SnackbarContext } from '../Snackbar/SnackbarProvider';
import { readFileAsFile } from './imageTestUtils';
import { ImageUploadProvider } from './ImageUploadProvider';
import { useImageUpload } from './useImageUpload';

vi.mock('../../lib', async () => ({
  ...(await vi.importActual<typeof import('../../lib')>('../../lib')),
  determineImageSize: () => {
    // Always return a static value here, because js-dom doesn't implement Image.
    return Promise.resolve({ width: 40, height: 20 });
  },
}));

describe('<ImageUploadProvider />', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let widgetApi: MockedWidgetApi;
  let showSnackbar: (snackbar: SnackbarProps) => void;
  let clearSnackbar: () => void;
  let consoleSpy: MockInstance<typeof console.error>;

  beforeEach(() => {
    widgetApi = mockWidgetApi();
    showSnackbar = vi.fn();
    clearSnackbar = vi.fn();
    consoleSpy = vi.spyOn(console, 'error');

    Wrapper = ({ children }) => {
      return (
        <SnackbarContext.Provider
          value={{ showSnackbar, clearSnackbar, snackbarProps: {} }}
        >
          <WidgetApiMockProvider value={widgetApi}>
            <ImageUploadProvider>{children}</ImageUploadProvider>
          </WidgetApiMockProvider>
        </SnackbarContext.Provider>
      );
    };
  });

  afterEach(() => {
    widgetApi.stop();
    consoleSpy.mockRestore();
  });

  it('should upload an image', async () => {
    const { result } = renderHook(useImageUpload, {
      wrapper: Wrapper,
    });

    const file = await readFileAsFile('nordeck.jpg');
    widgetApi.uploadFile.mockResolvedValue({
      content_uri: 'mxc://example.com/abc123',
    });

    let results;
    await act(async () => {
      results = await result.current.handleDrop([file], []);
    });

    expect(results).toEqual([
      {
        status: 'fulfilled',
        value: {
          fileName: 'nordeck.jpg',
          mxc: 'mxc://example.com/abc123',
          size: {
            width: 40,
            height: 20,
          },
        },
      },
    ]);
  });

  it('should catch read file errors', async () => {
    consoleSpy.mockImplementation(() => {});
    const { result } = renderHook(useImageUpload, {
      wrapper: Wrapper,
    });

    const file = new File([], 'example.jpg', {
      type: 'image/jpeg',
    });
    const readFileError = new Error('error reading file');
    const arrayBufferMock = vi
      .mocked(file.arrayBuffer)
      .mockRejectedValue(readFileError);

    let results;
    await act(async () => {
      results = await result.current.handleDrop([file], []);
    });

    expect(console.error).toHaveBeenCalledWith(
      'Error uploading an image',
      readFileError,
    );
    expect(results).toEqual([
      {
        status: 'rejected',
        reason: readFileError,
      },
    ]);

    arrayBufferMock.mockRestore();
  });

  it('should catch upload file errors', async () => {
    consoleSpy.mockImplementation(() => {});
    const { result } = renderHook(useImageUpload, {
      wrapper: Wrapper,
    });

    const file = await readFileAsFile('nordeck.svg');
    const uploadFileError = new Error('Unsupported filetype');
    widgetApi.uploadFile.mockRejectedValue(uploadFileError);

    let results;
    await act(async () => {
      results = await result.current.handleDrop([file], []);
    });

    expect(console.error).toHaveBeenCalledWith(
      'Error uploading an image',
      uploadFileError,
    );
    expect(results).toEqual([
      {
        status: 'rejected',
        reason: uploadFileError,
      },
    ]);
  });

  it('should show a snackbar while an image is uploaded', async () => {
    const { result } = renderHook(useImageUpload, {
      wrapper: Wrapper,
    });

    const file = new File([], 'example.jpg', {
      type: 'image/jpeg',
    });
    let resolveUploadPromise: (
      value: IUploadFileActionFromWidgetResponseData,
    ) => void;
    const uploadPromise = new Promise<IUploadFileActionFromWidgetResponseData>(
      (resolve) => {
        resolveUploadPromise = resolve;
      },
    );

    widgetApi.uploadFile.mockReturnValue(uploadPromise);

    act(() => {
      result.current.handleDrop([file], []);
    });

    // upload ongoing, snackbar expected
    expect(showSnackbar).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'The file is being uploaded…',
      }),
    );
    expect(clearSnackbar).not.toHaveBeenCalled();

    // resolve upload Promise to finish the upload process
    await act(async () => {
      resolveUploadPromise({
        content_uri: 'mxc://example.com/abc123',
      });
    });

    // the snackbar should disappear
    expect(clearSnackbar).toHaveBeenCalled();
  });

  it('should show a snackbar for images that exceed the size limit', async () => {
    const { result } = renderHook(useImageUpload, {
      wrapper: Wrapper,
    });

    const rejectedFile: FileRejection = {
      file: new File([], 'example.jpg'),
      errors: [{ message: 'file too large', code: ErrorCode.FileTooLarge }],
    };
    await act(async () => {
      await result.current.handleDrop([], [rejectedFile]);
    });

    expect(showSnackbar).toHaveBeenCalledWith(
      expect.objectContaining({
        message:
          'The file example.jpg cannot be uploaded due to its size. The upload is possible for a maximum of 25 MiB per file.',
        autoHideDuration: 10000,
      }),
    );
  });

  it('should show a snackbar for files with unsupported types', async () => {
    const { result } = renderHook(useImageUpload, {
      wrapper: Wrapper,
    });

    const rejectedFile: FileRejection = {
      file: new File([], 'example.txt', { type: 'text/plain' }),
      errors: [
        { message: 'file invalid type', code: ErrorCode.FileInvalidType },
      ],
    };
    await act(async () => {
      await result.current.handleDrop([], [rejectedFile]);
    });

    expect(showSnackbar).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'The file example.txt cannot be uploaded.',
        autoHideDuration: 10000,
      }),
    );
  });

  it('should show a snackbar for images that failed for other reasons', async () => {
    consoleSpy.mockImplementation(() => {});
    const { result } = renderHook(useImageUpload, {
      wrapper: Wrapper,
    });

    const file = new File([], 'example.jpg', {
      type: 'image/jpeg',
    });
    const readFileError = new Error('error reading file');
    const arrayBufferMock = vi
      .mocked(file.arrayBuffer)
      .mockRejectedValue(readFileError);
    await act(async () => {
      await result.current.handleDrop([file], []);
    });

    expect(console.error).toHaveBeenCalledWith(
      'Error uploading an image',
      readFileError,
    );
    expect(showSnackbar).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'The file example.jpg cannot be uploaded.',
        autoHideDuration: 10000,
      }),
    );

    arrayBufferMock.mockRestore();
  });

  describe('maxUploadSizeBytes', () => {
    it('should return the API upload size limit if it is lower than the NeoBoard limit', async () => {
      widgetApi.getMediaConfig.mockResolvedValue({
        'm.upload.size': 1337,
      });
      const { result } = renderHook(useImageUpload, {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.maxUploadSizeBytes).toBe(1337);
      });
    });

    it('should return the NeoBoard upload size limit if it is lower than the API limit', async () => {
      widgetApi.getMediaConfig.mockResolvedValue({
        'm.upload.size': 268435456,
      });
      const { result } = renderHook(useImageUpload, {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.maxUploadSizeBytes).toBe(26214400);
      });
    });
  });
});
