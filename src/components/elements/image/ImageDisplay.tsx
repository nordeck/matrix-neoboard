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

import { HideImageOutlined } from '@mui/icons-material';
import { Container, Tooltip, styled } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ImageElement, useWhiteboardSlideInstance } from '../../../state';
import {
  ElementContextMenu,
  MoveableElement,
  SelectableElement,
  WithExtendedSelectionProps,
} from '../../Whiteboard';
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
  width,
  height,
  position,
  active,
  readOnly,
  elementId,
  activeElementIds = [],
  overrides = {},
}: ImageDisplayProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const slideInstance = useWhiteboardSlideInstance();

  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);

  const handleLoad = useCallback(() => {
    setLoading(false);
    setLoadError(false);

    slideInstance.updateElement(elementId, {
      available: true,
    });
  }, [setLoading, slideInstance, elementId]);

  const handleLoadError = useCallback(() => {
    setLoading(false);
    setLoadError(true);

    slideInstance.updateElement(elementId, {
      available: false,
    });
  }, [setLoading, setLoadError, slideInstance, elementId]);

  const httpUri = useMemo(
    () => convertMxcToHttpUrl(mxc, baseUrl) ?? '',
    [baseUrl, mxc],
  );

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
    <Container data-testid={`element-${elementId}-error-container`}>
      <Tooltip title={t('imageUpload.loadError', 'The file is not available.')}>
        <rect
          data-testid={`element-${elementId}-error-placeholder`}
          x={position.x}
          y={position.y}
          height={height}
          fill={alpha(theme.palette.error.main, 0.05)}
          stroke={theme.palette.error.main}
          strokeWidth={`2`}
          strokeDashoffset={10}
          strokeDasharray={'5 0 5'}
          width={width}
        />
      </Tooltip>
      <HideImageOutlined
        data-testid={`element-${elementId}-error-icon`}
        x={position.x + width / 2 - width / 6}
        y={position.y + height / 2 - height / 6}
        width={width / 3}
        height={height / 3}
        sx={(theme) => ({
          color: alpha(theme.palette.error.main, 0.3),
        })}
      />
    </Container>
  ) : null;

  const renderedChild = !loadError ? (
    <Image
      data-testid={`element-${elementId}-image`}
      href={httpUri}
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
