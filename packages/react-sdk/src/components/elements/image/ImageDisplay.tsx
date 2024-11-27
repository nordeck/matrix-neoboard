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
import { getLogger } from 'loglevel';
import { Suspense, useCallback } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import useSWRImmutable from 'swr/immutable';
import { getSVGUnsafe } from '../../../imageUtils';
import { convertMxcToHttpUrl, WidgetApiActionError } from '../../../lib';
import { ImageElement } from '../../../state';
import {
  ElementContextMenu,
  MoveableElement,
  SelectableElement,
  WithExtendedSelectionProps,
} from '../../Whiteboard';
import { OtherProps } from '../../Whiteboard/Element/ConnectedElement';
import { ImagePlaceholder } from './ImagePlaceholder';
import { Skeleton } from './Skeleton';

/**
 * Download a file from the widget API or fallback to HTTP download.
 *
 * @returns The data URL of the downloaded file. This can be a blob url or a http url.
 */
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

    // Convert the widget API response to a Blob with given size and type
    if (!(result.file instanceof Blob)) {
      throw new Error('Got non Blob file response');
    }
    // Check if the blob is an SVG
    // The try catch is because of the blob to text conversion
    let blob;
    try {
      const stringFromBlob = await result.file.text();

      // Check if the string is an SVG
      // We use this call as a condition here. If it works we know it's an SVG. If it throws an error we know it's not an SVG
      getSVGUnsafe(stringFromBlob);
      blob = result.file.slice(0, result.file.size, 'image/svg+xml');
    } catch {
      // If it fails, return the blob as is
      blob = result.file.slice(0, result.file.size);
    }

    // Convert blob to blob URL
    const downloadedFileDataUrl = URL.createObjectURL(blob);
    if (downloadedFileDataUrl === '') {
      throw new Error('Failed to create object URL');
    }
    return downloadedFileDataUrl;
  } catch (error) {
    const logger = getLogger('ImageDisplay.downloadFile');
    if (error instanceof WidgetApiActionError) {
      logger.warn(
        'Widget API downloadFile not available, falling back to HTTP download',
      );
      return tryFallbackDownload(mxc, baseUrl);
    } else {
      logger.error('Failed to download image:', error);
      throw error;
    }
  }
};

/**
 * Try to download a file using the widget API.
 *
 * @param widgetApi The widget API to use for downloading the file
 * @param mxc The mxc URL of the file to download
 * @returns The file data as `Promise<IDownloadFileActionFromWidgetResponseData>
 * @throws {WidgetApiActionError} If the widget API does not support the downloadFile action
 */
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

/**
 * Try getting an http url for the given mxc url.
 *
 * @param mxc The mxc URL of the file to download
 * @param baseUrl The base URL of the matrix homeserver
 * @param mimeType The MIME type of the file
 * @returns The URL of the file. Note this is an blob URL for SVG files.
 */
const tryFallbackDownload = async (
  mxc: string,
  baseUrl: string,
) => {
  const httpUrl = convertMxcToHttpUrl(mxc, baseUrl);

  if (httpUrl === null) {
    return '';
  }

  try {
    const response = await fetch(httpUrl);
    const rawBlob = await response.blob();
    try {
      const svgBlob = rawBlob.slice(0, rawBlob.size, 'image/svg+xml');
      return URL.createObjectURL(svgBlob);
    } catch {
      const imageBlob = rawBlob.slice(0, rawBlob.size);
      return URL.createObjectURL(imageBlob);
    }
  } catch (fetchError) {
    const logger = getLogger('ImageDisplay.tryFallbackDownload');
    logger.error('Failed to fetch SVG image:', fetchError);
    throw new Error('Failed to fetch SVG image');
  }
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
  const { data: imageUri } = useSWRImmutable(
    { widgetApi, baseUrl, mxc },
    downloadFile,
    { suspense: true },
  );

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

function ImageDisplayWrapper({
  element,
  otherProps,
}: {
  element: ImageElement;
  otherProps: OtherProps;
}) {
  const widgetApi = useWidgetApi();

  if (widgetApi.widgetParameters.baseUrl === undefined) {
    console.error('Image cannot be rendered due to missing base URL');
    return null;
  }

  return (
    <Suspense
      fallback={
        <Skeleton
          data-testid={`element-${otherProps.elementId}-skeleton`}
          x={element.position.x}
          y={element.position.y}
          width={element.width}
          height={element.height}
        />
      }
    >
      <ErrorBoundary
        fallback={
          <ImagePlaceholder
            position={element.position}
            width={element.width}
            height={element.height}
            elementId={otherProps.elementId}
          />
        }
      >
        <ImageDisplay
          baseUrl={widgetApi.widgetParameters.baseUrl}
          {...element}
          {...otherProps}
        />
      </ErrorBoundary>
    </Suspense>
  );
}

export default ImageDisplayWrapper;
