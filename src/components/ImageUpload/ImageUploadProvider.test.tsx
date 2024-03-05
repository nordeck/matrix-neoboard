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
import { render, screen, waitFor } from '@testing-library/react';
import { IUploadFileActionFromWidgetResponseData } from 'matrix-widget-api';
import { ComponentType, PropsWithChildren } from 'react';
import { act } from 'react-dom/test-utils';
import { ErrorCode, FileRejection } from 'react-dropzone';
import { defer } from '../../lib';
import { SnackbarProvider } from '../Snackbar';
import {
  ImageUploadContextValue,
  ImageUploadProvider,
} from './ImageUploadProvider';
import { useImageUpload } from './useImageUpload';

jest.mock('../../lib', () => ({
  ...jest.requireActual('../../lib'),
  determineImageSize: () => {
    // Always return a static value here, because js-dom doesn't implement Image.
    return Promise.resolve({ width: 40, height: 20 });
  },
}));

describe('<ImageUploadProvider />', () => {
  let ImageProviderTest: ComponentType<PropsWithChildren<{}>>;
  let widgetApi: MockedWidgetApi;
  let imageUploadContextValue: ImageUploadContextValue;

  beforeEach(() => {
    widgetApi = mockWidgetApi();

    function ImageUploadContextValueExtractor() {
      imageUploadContextValue = useImageUpload();
      return null;
    }

    ImageProviderTest = () => {
      return (
        <SnackbarProvider>
          <WidgetApiMockProvider value={widgetApi}>
            <ImageUploadProvider>
              <ImageUploadContextValueExtractor />
            </ImageUploadProvider>
          </WidgetApiMockProvider>
        </SnackbarProvider>
      );
    };
  });

  afterEach(() => {
    widgetApi.stop();
  });

  it('should upload an image', async () => {
    render(<ImageProviderTest />);

    const file = new File([], 'example.jpg', {
      type: 'image/jpeg',
    });
    widgetApi.uploadFile.mockResolvedValue({
      content_uri: 'mxc://example.com/abc123',
    });

    let results;
    await act(async () => {
      results = await imageUploadContextValue.handleDrop([file], []);
    });

    expect(results).toEqual([
      {
        status: 'fulfilled',
        value: {
          fileName: 'example.jpg',
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
    render(<ImageProviderTest />);

    const file = new File([], 'example.jpg', {
      type: 'image/jpeg',
    });
    const readFileError = new Error('error reading file');
    jest.mocked(file.arrayBuffer).mockRejectedValue(readFileError);

    let results;
    await act(async () => {
      results = await imageUploadContextValue.handleDrop([file], []);
    });

    expect(results).toEqual([
      {
        status: 'rejected',
        reason: readFileError,
      },
    ]);
  });

  it('should catch upload file errors', async () => {
    render(<ImageProviderTest />);

    const file = new File([], 'example.jpg', {
      type: 'image/jpeg',
    });
    const uploadFileError = new Error('error uploading file');
    widgetApi.uploadFile.mockRejectedValue(uploadFileError);

    let results;
    await act(async () => {
      results = await imageUploadContextValue.handleDrop([file], []);
    });

    expect(results).toEqual([
      {
        status: 'rejected',
        reason: uploadFileError,
      },
    ]);
  });

  it('should show a snackbar while an image is uploaded', async () => {
    render(<ImageProviderTest />);

    const file = new File([], 'example.jpg', {
      type: 'image/jpeg',
    });
    const uploadDeferred = defer<IUploadFileActionFromWidgetResponseData>();
    widgetApi.uploadFile.mockReturnValue(uploadDeferred.promise);

    act(() => {
      imageUploadContextValue.handleDrop([file], []);
    });

    // upload ongoing, snackbar expected
    expect(screen.getByText('The file is uploaded.')).toBeInTheDocument();

    // resolve upload Promise to finish the upload process
    act(() => {
      uploadDeferred.resolve({
        content_uri: 'mxc://example.com/abc123',
      });
    });

    // the snackbar should disappear
    await waitFor(() => {
      expect(
        screen.queryByText('The file is uploaded.'),
      ).not.toBeInTheDocument();
    });
  });

  it('should show a snackbar for images that exceed the size limit', async () => {
    render(<ImageProviderTest />);

    const rejectedFile: FileRejection = {
      file: new File([], 'example.jpg'),
      errors: [{ message: 'file too large', code: ErrorCode.FileTooLarge }],
    };
    await act(async () => {
      await imageUploadContextValue.handleDrop([], [rejectedFile]);
    });

    expect(
      screen.getByText(
        'The file example.jpg cannot be uploaded due to its size. The upload is possible for a maximum of 25 MiB per file.',
      ),
    ).toBeInTheDocument();
  });

  it('should show a snackbar for files with unsupported types', async () => {
    render(<ImageProviderTest />);

    const rejectedFile: FileRejection = {
      file: new File([], 'example.txt', { type: 'text/plain' }),
      errors: [
        { message: 'file invalid type', code: ErrorCode.FileInvalidType },
      ],
    };
    await act(async () => {
      await imageUploadContextValue.handleDrop([], [rejectedFile]);
    });

    expect(
      screen.getByText('The file example.txt cannot be uploaded.'),
    ).toBeInTheDocument();
  });

  it('should show a snackbar for images that failed for other reasons', async () => {
    render(<ImageProviderTest />);

    const file = new File([], 'example.jpg', {
      type: 'image/jpeg',
    });
    jest
      .mocked(file.arrayBuffer)
      .mockRejectedValue(new Error('error reading file'));
    await act(async () => {
      await imageUploadContextValue.handleDrop([file], []);
    });

    expect(
      screen.getByText('The file example.jpg cannot be uploaded.'),
    ).toBeInTheDocument();
  });

  describe('maxUploadSizeBytes', () => {
    it('should return the API upload size limit if it is lower than the NeoBoard limit', async () => {
      widgetApi.getMediaConfig.mockResolvedValue({
        'm.upload.size': 1337,
      });
      render(<ImageProviderTest />);

      await waitFor(() => {
        expect(imageUploadContextValue.maxUploadSizeBytes).toBe(1337);
      });
    });

    it('should return the NeoBoard upload size limit if it is lower than the API limit', async () => {
      widgetApi.getMediaConfig.mockResolvedValue({
        'm.upload.size': 268435456,
      });
      render(<ImageProviderTest />);

      await waitFor(() => {
        expect(imageUploadContextValue.maxUploadSizeBytes).toBe(26214400);
      });
    });
  });
});
