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

import { styled } from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import { convertMxcToHttpUrl } from '../../../lib';
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

/**
 * Render an image.
 * Show a skeleton of the same while the image is loading.
 */
function ImageDisplay({
  baseUrl,
  mxc,
  mimeType,
  width,
  height,
  position,
  active,
  readOnly,
  elementId,
  activeElementIds = [],
  overrides = {},
}: ImageDisplayProps) {
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

  // This effect determines the image URI.
  useEffect(() => {
    // Used to not race the fetch in case of an svg. Without this we can race our request.
    let abortController: AbortController | undefined;

    // Load the image URI.
    const httpUrl = convertMxcToHttpUrl(mxc, baseUrl);

    if (httpUrl === null) {
      // Clear the image URI if there is no HTTP URL.
      setImageUri('');
      return;
    }

    if (mimeType === 'image/svg+xml') {
      abortController = new AbortController();
      // Special handling of SVG images, because the media repo response does not provide mime type information for it.
      // Fetch it and set it from a Blob.
      fetch(httpUrl, { signal: abortController.signal })
        .then((response) => response.blob())
        .then((rawBlob) => {
          const svgBlob = rawBlob.slice(0, rawBlob.size, mimeType);
          setImageUri(URL.createObjectURL(svgBlob));
          return;
        })
        .catch((error) => {
          console.error('Failed to fetch SVG image:', error);
          setLoadError(true);
        });
      return;
    }

    setImageUri(httpUrl);

    // On unmount revoke the object URL.
    return () => {
      if (abortController) {
        abortController.abort();
      }
    };
  }, [setLoadError, setImageUri, baseUrl, mxc, mimeType]);

  const renderedSkeleton = loading ? (
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
