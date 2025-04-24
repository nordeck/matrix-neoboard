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

import { Box, styled } from '@mui/material';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSvgCanvasContext } from '../Whiteboard/SvgCanvas';
import { useSlideImageUpload } from './useSlideImageUpload';

type SlideImageUploadOverlayProps = {
  onDragLeave: () => void;
};

export const SlideImageUploadOverlay: React.FC<SlideImageUploadOverlayProps> =
  function ({ onDragLeave }) {
    const { t } = useTranslation('neoboard');
    const { calculateSvgCoords } = useSvgCanvasContext();
    const { getRootProps, getInputProps } = useSlideImageUpload({
      noClick: true,
      calculateSvgCoords,
    });

    return (
      <Overlay
        data-testid="slide-image-upload-overlay"
        {...getRootProps({ onDragLeave, onDrop: onDragLeave })}
      >
        <input
          data-testid="slide-image-upload-overlay-input"
          aria-hidden={true}
          {...getInputProps()}
        />
        <UploadText>{t('app.dropToUpload', 'Drop to upload')}</UploadText>
      </Overlay>
    );
  };

const Overlay = styled(Box)({
  alignItems: 'center',
  backgroundColor: 'rgba(0, 0, 0, 0.1)',
  display: 'flex',
  height: '100%',
  justifyContent: 'center',
  left: 0,
  position: 'absolute',
  top: 0,
  width: '100%',
  zIndex: 10000,
});

const UploadText = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  borderRadius: '1rem',
  color: theme.palette.text.primary,
  fontSize: '4rem',
  fontWeight: 'bold',
  padding: '2rem',
  // Prevent the text from catching drag events.
  // They should only be handled by the overlay.
  pointerEvents: 'none',
}));
