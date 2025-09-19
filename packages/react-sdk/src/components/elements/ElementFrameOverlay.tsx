/*
 * Copyright 2025 Nordeck IT + Consulting GmbH
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

import { useTheme } from '@mui/material';
import { BoundingRect } from '../../state';

/**
 * An overlay that is shown when the element is moved over the frame.
 */
export function ElementFrameOverlay({
  offsetX,
  offsetY,
  width,
  height,
}: BoundingRect) {
  const theme = useTheme();

  return (
    <rect
      x={offsetX}
      y={offsetY}
      fill={theme.palette.grey[500]}
      fillOpacity={0.5}
      height={height}
      width={width}
    />
  );
}
