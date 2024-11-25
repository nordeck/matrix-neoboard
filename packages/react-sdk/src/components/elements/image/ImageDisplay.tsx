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
import { styled } from '@mui/material';
import { IDownloadFileActionFromWidgetResponseData } from 'matrix-widget-api';
import React, { useCallback, useEffect, useState } from 'react';
import { convertMxcToHttpUrl, WidgetApiActionError } from '../../../lib';
import { ImageElement } from '../../../state';
import {
  ElementContextMenu,
  MoveableElement,
  SelectableElement,
  WithExtendedSelectionProps,
} from '../../Whiteboard';
import { ImagePlaceholder } from './ImagePlaceholder';
import { Skeleton } from './Skeleton';

type ImageDisplayProps = Omit<ImageElement, 'kind'> &
  WithExtendedSelectionProps & {
    /**
     * Matrix homeserver base URL
     */
    baseUrl: string;
  };

const Image = styled('image', {
  shouldForwardProp: (p) => p !== 'loading',
})<{ loading: boolean }>(({ loading }) => ({
  userSelect: 'none',
  WebkitUserSelect: 'none',
  // prevention of partial rendering if the image has not yet been fully loaded
  visibility: loading ? 'hidden' : 'visible',
}));

function isSVG(svg: string): boolean {
  const parser = new DOMParser();
  const svgDom = parser.parseFromString(svg, 'image/svg+xml');
  if (svgDom.documentElement.tagName === 'svg') {
    return true;
  }
  return false;
}

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
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [imageUri, setImageUri] = useState<undefined | string>();

  const handleLoad = useCallback(() => {
    setLoading(false);
    setLoadError(false);

    // This can happen directly when the image is loaded and saves some memory.
    if (imageUri) {
      URL.revokeObjectURL(imageUri);
    }
  }, [setLoading, setLoadError, imageUri]);

  const handleLoadError = useCallback(() => {
    setLoading(false);
    setLoadError(true);
  }, [setLoading, setLoadError]);

  useEffect(() => {
    const downloadFile = async () => {
      try {
        const result = await tryDownloadFileWithWidgetApi(mxc);
        const blob = await getBlobFromResult(result);
        const downloadedFileDataUrl = createObjectUrlFromBlob(blob);
        setImageUri(downloadedFileDataUrl);
      } catch (error) {
        handleDownloadError(error as Error);
      }
    };

    const tryDownloadFileWithWidgetApi = async (mxc: string) => {
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
        if (isSVG(stringFromBlob)) {
          return result.file.slice(0, result.file.size, 'image/svg+xml');
        }
        {
          return result.file.slice(0, result.file.size);
        }
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

    const handleDownloadError = (error: Error) => {
      if (error instanceof WidgetApiActionError) {
        tryFallbackDownload();
      } else {
        setLoadError(true);
      }
    };

    const tryFallbackDownload = async () => {
      const httpUrl = convertMxcToHttpUrl(mxc, baseUrl);

      if (httpUrl === null) {
        setImageUri('');
        return;
      }
      setImageUri(httpUrl);

      return;
    };

    downloadFile();
  }, [baseUrl, mxc, widgetApi]);

  const renderedSkeleton =
    loading && !loadError ? (
      <Skeleton
        data-testid={`element-${elementId}-skeleton`}
        x={position.x}
        y={position.y}
        width={width}
        height={height}
      />
    ) : null;

  const renderedPlaceholder = loadError ? (
    <ImagePlaceholder
      position={position}
      width={width}
      height={height}
      elementId={elementId}
    />
  ) : null;

  const renderedChild =
    imageUri !== undefined && !loadError ? (
      <Image
        data-testid={`element-${elementId}-image`}
        href={imageUri}
        x={position.x}
        y={position.y}
        width={width}
        height={height}
        preserveAspectRatio="none"
        onLoad={handleLoad}
        onError={handleLoadError}
        loading={loading}
      />
    ) : null;

  if (readOnly) {
    return (
      <>
        {renderedSkeleton} {renderedChild} {renderedPlaceholder}
      </>
    );
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
            {renderedSkeleton}
            {renderedChild}
            {renderedPlaceholder}
          </ElementContextMenu>
        </MoveableElement>
      </SelectableElement>
    </>
  );
}

export default React.memo(ImageDisplay);
