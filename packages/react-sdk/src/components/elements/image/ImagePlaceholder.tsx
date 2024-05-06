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
import { Tooltip } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { Point } from '../../../state';

export const ImagePlaceholder = ({
  position,
  width,
  height,
  elementId,
}: {
  position: Point;
  height: number;
  width: number;
  elementId: string;
}) => {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <g data-testid={`element-${elementId}-error-container`}>
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
    </g>
  );
};
