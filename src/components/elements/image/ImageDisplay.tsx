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
  }, [setLoading, setLoadError]);

  const handleLoadError = useCallback(() => {
    setLoading(false);
    setLoadError(true);
  }, [setLoading, setLoadError]);

  // This effect determines the image URI.
  useEffect(() => {
    (async () => {
      const httpUrl = convertMxcToHttpUrl(mxc, baseUrl);

      if (httpUrl === null) {
        // Clear the image URI if there is no HTTP URL.
        setImageUri('');
        return;
      }

      if (mimeType === 'image/svg+xml') {
        // Special handling of SVG images, because the media repo response does not provide mime type information for it.
        // Fetch it and set it from a Blob.
        const response = await fetch(httpUrl);
        const rawBlob = await response.blob();
        const svgBlob = rawBlob.slice(0, rawBlob.size, mimeType);
        setImageUri(URL.createObjectURL(svgBlob));
        return;
      }

      return setImageUri(httpUrl);
    })();

    return () => {
      if (imageUri) {
        URL.revokeObjectURL(imageUri);
      }
    };
  }, [baseUrl, imageUri, mimeType, mxc]);

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

/**
 * Converts an MXC URI to an HTTP URL.
 * {@link https://github.com/matrix-org/matrix-js-sdk/blob/1b7695cdca841672d582168a19bfe77f00207fea/src/content-repo.ts#L36}
 *
 * @todo This should probably live inside the widget toolkit
 * @param mxcUrl - MXC URL {@link https://spec.matrix.org/v1.9/client-server-api/#matrix-content-mxc-uris}
 * @param baseUrl - Homeserver base URL
 * @returns HTTP URL or null if the MXC URI cannot be parsed
 */
function convertMxcToHttpUrl(mxcUrl: string, baseUrl: string): string | null {
  if (mxcUrl.indexOf('mxc://') !== 0) {
    return null;
  }

  const serverAndMediaId = mxcUrl.slice(6);
  const prefix = '/_matrix/media/v3/download/';

  return baseUrl + prefix + serverAndMediaId;
}

export default React.memo(ImageDisplay);
