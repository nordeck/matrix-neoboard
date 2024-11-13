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

import { WidgetApi } from '@matrix-widget-toolkit/api';
import { useWidgetApi } from '@matrix-widget-toolkit/react';
import { styled } from '@mui/material';
import { IDownloadFileActionFromWidgetResponseData } from 'matrix-widget-api';
import React, { useCallback } from 'react';
import useSWR from 'swr';
import { getSVGUnsafe } from '../../../imageUtils';
import { convertMxcToHttpUrl, WidgetApiActionError } from '../../../lib';
import { ImageElement } from '../../../state';
import {
  ElementContextMenu,
  MoveableElement,
  SelectableElement,
  WithExtendedSelectionProps,
} from '../../Whiteboard';

const downloadFile = async ({
  widgetApi,
  baseUrl,
  mxc,
}: {
  widgetApi: WidgetApi;
  baseUrl: string;
  mxc: string;
}) => {
  try {
    const result = await tryDownloadFileWithWidgetApi(widgetApi, mxc);
    const blob = await getBlobFromResult(result);
    const downloadedFileDataUrl = createObjectUrlFromBlob(blob);
    return downloadedFileDataUrl;
  } catch (error) {
    handleDownloadError(error as Error, mxc, baseUrl);
  }
};

const tryDownloadFileWithWidgetApi = async (
  widgetApi: WidgetApi,
  mxc: string,
) => {
  try {
    const result = await widgetApi.downloadFile(mxc);
    return result;
  } catch {
    throw new WidgetApiActionError('downloadFile not available');
  }
};

const getBlobFromResult = async (
  result: IDownloadFileActionFromWidgetResponseData,
): Promise<Blob> => {
  if (!(result.file instanceof Blob)) {
    throw new Error('Got non Blob file response');
  }
  // Check if the blob is an SVG
  // The try catch is because of the blob to text conversion
  try {
    const stringFromBlob = await result.file.text();

    // Check if the string is an SVG
    // We use this call as a condition here. If it works we know it's an SVG. If it throws an error we know it's not an SVG
    getSVGUnsafe(stringFromBlob);
    return result.file.slice(0, result.file.size, 'image/svg+xml');
  } catch {
    // If it fails, return the blob as is
    return result.file.slice(0, result.file.size);
  }
};

const createObjectUrlFromBlob = (blob: Blob): string => {
  const url = URL.createObjectURL(blob);
  if (url === '') {
    throw new Error('Failed to create object URL');
  }
  return url;
};

const handleDownloadError = (error: Error, mxc: string, baseUrl: string) => {
  if (error instanceof WidgetApiActionError) {
    tryFallbackDownload(mxc, baseUrl);
  } else {
    throw error;
  }
};

const tryFallbackDownload = async (mxc: string, baseUrl: string) => {
  const httpUrl = convertMxcToHttpUrl(mxc, baseUrl);

  if (httpUrl === null) {
    return '';
  }
  return httpUrl;
};

type ImageDisplayProps = Omit<ImageElement, 'kind'> &
  WithExtendedSelectionProps & {
    /**
     * Matrix homeserver base URL
     */
    baseUrl: string;
  };

const Image = styled(
  'image',
  {},
)<{}>(() => ({
  userSelect: 'none',
  WebkitUserSelect: 'none',
}));

/**
 * Render an image.
 * Show a skeleton of the same while the image is loading.
 */
function ImageDisplay({
  baseUrl,
  mxc,
  width,
  height,
  position,
  active,
  readOnly,
  elementId,
  activeElementIds = [],
  overrides = {},
}: ImageDisplayProps) {
  const widgetApi = useWidgetApi();
  const { data: imageUri } = useSWR({ widgetApi, baseUrl, mxc }, downloadFile, {
    suspense: true,
  });

  const handleLoad = useCallback(() => {
    // This can happen directly when the image is loaded and saves some memory.
    if (imageUri) {
      URL.revokeObjectURL(imageUri);
    }
  }, [imageUri]);

  const renderedChild =
    imageUri !== undefined ? (
      <Image
        data-testid={`element-${elementId}-image`}
        href={imageUri}
        x={position.x}
        y={position.y}
        width={width}
        height={height}
        preserveAspectRatio="none"
        onLoad={handleLoad}
      />
    ) : null;

  if (readOnly) {
    return <>{renderedChild}</>;
  }

  return (
    <>
      <SelectableElement
        active={active}
        readOnly={readOnly}
        elementId={elementId}
      >
        <MoveableElement elementId={elementId} overrides={overrides}>
          <ElementContextMenu activeElementIds={activeElementIds}>
            {renderedChild}
          </ElementContextMenu>
        </MoveableElement>
      </SelectableElement>
    </>
  );
}

export default React.memo(ImageDisplay);
