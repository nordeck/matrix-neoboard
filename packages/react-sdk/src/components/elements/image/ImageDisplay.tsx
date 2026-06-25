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
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getSVGUnsafe } from '../../../imageUtils';
import {
  acquireImageUrl,
  convertMxcToHttpUrl,
  releaseImageUrl,
  WidgetApiActionError,
} from '../../../lib';
import { ImageElement } from '../../../state';
import {
  ElementContextMenu,
  MoveableElement,
  SelectableElement,
  WithExtendedSelectionProps,
} from '../../Whiteboard';
import { ElementFrameOverlay } from '../ElementFrameOverlay';
import { ImagePlaceholder } from './ImagePlaceholder';
import { Skeleton } from './Skeleton';

type ImageDisplayProps = Omit<ImageElement, 'kind'> &
  WithExtendedSelectionProps & {
    /**
     * Matrix homeserver base URL
     */
    baseUrl: string;
    rotation?: number;
  };

const Image = styled('image', {
  shouldForwardProp: (p) => p !== 'loading',
})<{ loading: boolean }>(({ loading }) => ({
  userSelect: 'none',
  WebkitUserSelect: 'none',
  // prevention of partial rendering if the image has not yet been fully loaded
  visibility: loading ? 'hidden' : 'visible',
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
  elements = {},
  elementMovedHasFrame,
  rotation,
}: ImageDisplayProps) {
  const widgetApi = useWidgetApi();
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [imageUri, setImageUri] = useState<undefined | string>();

  const handleLoad = useCallback(() => {
    setLoading(false);
    setLoadError(false);
  }, [setLoading, setLoadError]);

  const handleLoadError = useCallback(() => {
    setLoading(false);
    setLoadError(true);
  }, [setLoading, setLoadError]);

  // Track whether this effect instance is still live. Using a ref so the
  // .then()/.catch() closures always read the current value without needing
  // to be listed as effect dependencies.
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;

    const download = async (): Promise<string> => {
      let result: IDownloadFileActionFromWidgetResponseData;
      try {
        result = await widgetApi.downloadFile(mxc);
      } catch {
        throw new WidgetApiActionError('downloadFile not available');
      }

      if (!(result.file instanceof Blob)) {
        throw new Error('Got non Blob file response');
      }

      // Check if the blob is an SVG
      // The try catch is because of the blob to text conversion
      let blob: Blob;
      try {
        const text = await result.file.text();

        // Check if the string is an SVG
        // We use this call as a condition here. If it works we know it's an SVG. If it throws an error we know it's not an SVG
        getSVGUnsafe(text);
        blob = result.file.slice(0, result.file.size, 'image/svg+xml');
      } catch {
        // If it fails, return the blob as is
        blob = result.file.slice(0, result.file.size);
      }

      const url = URL.createObjectURL(blob);
      if (url === '') {
        throw new Error('Failed to create object URL');
      }
      return url;
    };

    acquireImageUrl(mxc, download)
      .then((url: string) => {
        if (!cancelledRef.current) {
          setImageUri(url);
        }
        return undefined;
      })
      .catch((error: Error) => {
        if (cancelledRef.current) return;
        if (error instanceof WidgetApiActionError) {
          // Widget API unavailable — fall back to plain HTTP URL (not cached,
          // no blob to revoke).
          const httpUrl = convertMxcToHttpUrl(mxc, baseUrl);
          setImageUri(httpUrl ?? '');
        } else {
          setLoadError(true);
        }
      });

    return () => {
      cancelledRef.current = true;
      // Always release — acquireImageUrl always increments the ref count.
      // releaseImageUrl is a no-op if the entry was already removed (e.g. on
      // download failure).
      releaseImageUrl(mxc);
    };
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

  const transform = rotation
    ? `rotate(${rotation} ${position.x + width / 2} ${position.y + height / 2})`
    : undefined;

  const renderedChild =
    imageUri !== undefined && !loadError ? (
      <Image
        data-testid={`element-${elementId}-image`}
        href={imageUri}
        transform={transform}
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
        <MoveableElement elementId={elementId} elements={elements}>
          <ElementContextMenu activeElementIds={activeElementIds}>
            {renderedSkeleton}
            {renderedChild}
            {renderedPlaceholder}
            {elementMovedHasFrame && (
              <ElementFrameOverlay
                offsetX={position.x}
                offsetY={position.y}
                width={width}
                height={height}
              />
            )}
          </ElementContextMenu>
        </MoveableElement>
      </SelectableElement>
    </>
  );
}

export default React.memo(ImageDisplay);
