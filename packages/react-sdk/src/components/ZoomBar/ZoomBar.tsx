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

import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { useTheme } from '@mui/material';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useZoomControls } from '../../lib';
import { Toolbar, ToolbarButton } from '../common/Toolbar';

export const ZoomBar: React.FC = () => {
  const { t } = useTranslation('neoboard');
  const theme = useTheme();
  const toolbarTitle = t('zoomBar.title', 'Zoom controls');
  const { scale, resetZoom, zoomOut, zoomIn } = useZoomControls();

  const scalePercentage = Math.floor(100 * scale);

  return (
    <Toolbar aria-label={toolbarTitle} sx={{ pointerEvents: 'initial' }}>
      <ToolbarButton
        aria-label={t('zoomBar.zoomOut', 'Zoom out')}
        onClick={zoomOut}
      >
        <RemoveIcon />
      </ToolbarButton>
      <ToolbarButton
        aria-label={t('zoomBar.reset', 'Reset zoom to 100 %')}
        onClick={resetZoom}
        sx={{
          fontSize: '12px',
          height: '34px',
          minWidth: '56px',
          paddingLeft: theme.spacing(1),
          paddingRight: theme.spacing(1),
        }}
      >
        {scalePercentage} %
      </ToolbarButton>
      <ToolbarButton
        aria-label={t('zoomBar.zoomIn', 'Zoom in')}
        onClick={zoomIn}
      >
        <AddIcon />
      </ToolbarButton>
    </Toolbar>
  );
};
