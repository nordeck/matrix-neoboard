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

import { Skeleton, styled } from '@mui/material';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ImageElement } from '../../../state';
import {
  ElementContextMenu,
  MoveableElement,
  SelectableElement,
  WithSelectionProps,
} from '../../Whiteboard';

type ImageDisplayProps = ImageElement &
  WithSelectionProps & {
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
  width,
  height,
  position,
  active,
  readOnly,
  elementId,
}: ImageDisplayProps) {
  // Image loading errors are dealt with in follow-up tasks.
  // Don't care about invalid http URLs here.
  const httpUri = useMemo(
    () => convertMxcToHttpUrl(mxc, baseUrl) ?? '',
    [baseUrl, mxc],
  );
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    if (loading === false && showSkeleton === true) {
      // keep the skeleton around for some additional time,
      // so that the image has some time to render
      timeoutId = setTimeout(() => {
        setShowSkeleton(false);
      }, 2500);
    }

    return () => {
      clearTimeout(timeoutId);
    };
  }, [loading, setShowSkeleton, showSkeleton]);

  const handleLoad = useCallback(() => {
    setLoading(false);
  }, [setLoading]);

  const renderedSkeleton = showSkeleton ? (
    <foreignObject x={position.x} y={position.y} width={width} height={height}>
      <Skeleton
        data-testid={`element-${elementId}-skeleton`}
        variant="rectangular"
        width={width}
        height={height}
      />
    </foreignObject>
  ) : null;

  const renderedChild = (
    <Image
      data-testid={`element-${elementId}-image`}
      href={httpUri}
      x={position.x}
      y={position.y}
      width={width}
      height={height}
      preserveAspectRatio="none"
      onLoad={handleLoad}
      loading={loading}
    />
  );

  if (readOnly) {
    return (
      <>
        {renderedSkeleton} {renderedChild}
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
        <MoveableElement elementId={elementId}>
          <ElementContextMenu elementId={elementId}>
            {renderedSkeleton}
            {renderedChild}
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
