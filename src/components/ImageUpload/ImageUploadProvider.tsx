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

import { useWidgetApi } from '@matrix-widget-toolkit/react';
import { TFunction } from 'i18next';
import { PropsWithChildren, createContext, useCallback, useRef } from 'react';
import { ErrorCode, FileRejection } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import { determineImageSize } from '../../lib';
import { Size } from '../../state';
import { PromiseSettledResult } from '../../types';
import { SnackbarDismissAction, SnackbarProps, useSnackbar } from '../Snackbar';
import { useMaxUploadSize } from './useMaxUploadSize';

/**
 * Allow a maximum of 32 Megapixels image resolution.
 * Higher values can lead to rendering performance issues.
 */
const maxResolutionPixels = 32_000_000;

/**
 * Allow a maximum size of 24 MiB per image.
 * Higher values can lead to rendering performance issues.
 */
const maxImageSize = 26_214_400;

type UploadErrors = {
  /** Name of files that failed due to size restrictions */
  size: string[];
  /** Name of files that failed due to resolution restrictions */
  resolution: string[];
  /** Name of files that failed for other reasons */
  other: string[];
};

type ImageUploadResult = {
  fileName: string;
  size: Size;
  /**
   * MXC URI pointing to the uploaded image.
   * {@link https://spec.matrix.org/v1.9/client-server-api/#matrix-content-mxc-uris}
   */
  mxc: string;
};

export type ImageUploadState = {
  /**
   * Handle a file drop from react-dropzone.
   * Show a loading snackbar as long as uploads are in progress.
   * Once all uploads are finished show an error snackbar for errors, if any.
   * Can be called multiple times while other uploads are still running.
   *
   * @param files - Files to be uploaded from react-dropzone
   * @param rejectedFiles - Files rejected by react-dropzone
   * @returns Results for the uploaded files
   */
  handleDrop: (
    files: File[],
    rejectedFiles: FileRejection[],
  ) => Promise<PromiseSettledResult<ImageUploadResult>[]>;
  /**
   * Maximum upload size allowed by the server in bytes.
   */
  maxUploadSizeBytes: number;
};

class ResolutionTooHighError extends Error {
  constructor() {
    super('Resolution too high');
  }
}

export const ImageUploadContext = createContext<ImageUploadState | undefined>(
  undefined,
);

export function ImageUploadProvider({ children }: PropsWithChildren<{}>) {
  const { t } = useTranslation();
  const { clearSnackbar, showSnackbar } = useSnackbar();
  const widgetApi = useWidgetApi();
  /** Holds all files that are to be uploaded */
  const uploadQueue = useRef(new Set<File>());
  const uploadErrors = useRef<UploadErrors>({
    size: [],
    resolution: [],
    other: [],
  });
  const { maxUploadSizeBytes: serverMaxUploadSizeBytes } = useMaxUploadSize();
  const maxUploadSizeBytes = Math.min(serverMaxUploadSizeBytes, maxImageSize);

  const handleRejectedFile = useCallback((rejectedFile: FileRejection) => {
    if (
      rejectedFile.errors.some((error) => error.code === ErrorCode.FileTooLarge)
    ) {
      uploadErrors.current.size.push(rejectedFile.file.name);
    } else {
      uploadErrors.current.other.push(rejectedFile.file.name);
    }
  }, []);

  const uploadImage = useCallback(
    async (file: File) => {
      uploadQueue.current.add(file);

      try {
        const imageData = await file.arrayBuffer();
        const size = await determineImageSize(imageData);

        if (size.width * size.height > maxResolutionPixels) {
          throw new ResolutionTooHighError();
        }

        const uploadResult = await widgetApi.uploadFile(imageData);
        return { fileName: file.name, size, mxc: uploadResult.content_uri };
      } catch (error) {
        console.error('Error uploading an image', error);

        if (error instanceof ResolutionTooHighError) {
          uploadErrors.current.resolution.push(file.name);
        } else {
          uploadErrors.current.other.push(file.name);
        }

        throw error;
      } finally {
        uploadQueue.current.delete(file);
      }
    },
    [widgetApi],
  );

  const handleDrop = useCallback(
    async (files: File[], rejectedFiles: FileRejection[]) => {
      rejectedFiles.forEach(handleRejectedFile);

      if (files.length > 0) {
        const message = t(
          'imageUpload.fileIsUploaded',
          'The file is being uploaded…',
          {
            count: files.length,
          },
        );

        showSnackbar({
          key: message,
          message,
        });
      }

      const results = Promise.allSettled(files.map(uploadImage));

      results
        .then(() => {
          if (uploadQueue.current.size === 0) {
            // All uploads finished
            clearSnackbar();
            showErrorSnackbars(
              showSnackbar,
              uploadErrors.current,
              t,
              maxUploadSizeBytes,
            );
            uploadErrors.current = { size: [], resolution: [], other: [] };
          }
          return;
        })
        .catch(() => {
          // ignore
        });

      return results;
    },
    [
      clearSnackbar,
      handleRejectedFile,
      maxUploadSizeBytes,
      showSnackbar,
      uploadImage,
      t,
    ],
  );

  return (
    <ImageUploadContext.Provider value={{ handleDrop, maxUploadSizeBytes }}>
      {children}
    </ImageUploadContext.Provider>
  );
}

/**
 * Show snackbars for the different types of errors.
 *
 * @param showSnackbar - Function to show a snackbar {@link SnackbarContextValue}
 * @param errors - Errors for which a snackbar should be displayed
 * @param t - Translation function
 * @param maxUploadSizeBytes - Maximum allowed upload size in bytes
 */
function showErrorSnackbars(
  showSnackbar: (snackbar: SnackbarProps) => void,
  errors: UploadErrors,
  t: TFunction,
  maxUploadSizeBytes: number,
): void {
  if (errors.size.length > 0) {
    const message = t(
      'imageUpload.sizeError',
      'The file {{fileNames}} cannot be uploaded due to its size. The upload is possible for a maximum of {{limit}} per file.',
      {
        count: errors.size.length,
        fileNames: errors.size.join(', '),
        limit:
          (maxUploadSizeBytes / 1048576).toLocaleString(undefined, {
            maximumFractionDigits: 2,
          }) + ' MiB',
      },
    );

    showSnackbar({
      key: message,
      message,
      action: <SnackbarDismissAction />,
      autoHideDuration: 10000,
    });
  }

  if (errors.resolution.length > 0) {
    const message = t(
      'imageUpload.resolutionError',
      'The file {{fileNames}} cannot be uploaded due to its resolution. The upload is possible for a maximum of {{limit}} per file.',
      {
        count: errors.size.length,
        fileNames: errors.resolution.join(', '),
        limit:
          (maxResolutionPixels / 1_000_000).toLocaleString(undefined, {
            maximumFractionDigits: 2,
          }) + ' MP',
      },
    );

    showSnackbar({
      key: message,
      message,
      action: <SnackbarDismissAction />,
      autoHideDuration: 10000,
    });
  }

  if (errors.other.length > 0) {
    const message = t(
      'imageUpload.otherError',
      'The file {{fileNames}} cannot be uploaded.',
      {
        count: errors.other.length,
        fileNames: errors.other.join(', '),
      },
    );

    showSnackbar({
      key: message,
      message,
      action: <SnackbarDismissAction />,
      // autoHideDuration: 10000,
    });
  }
}
