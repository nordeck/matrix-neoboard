/*
 * Copyright 2026 Nordeck IT + Consulting GmbH
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

import { Box } from '@mui/material';
import clamp from 'lodash/clamp';
import { useMeasure } from '../../lib';
import { useSvgScaleContext } from '../Whiteboard/SvgScaleContext';
import PenElementBar from './PenElementBar';

export type PenElementBarWrapperProps = {
  /** Height, in pixels, of the ToolsBar row to float above. */
  bottomOffset: number;
};

/**
 * Positions the PenElementBar horizontally centered on the canvas, floating
 * slightly above the bottom ToolsBar row.
 */
export function PenElementBarWrapper({
  bottomOffset,
}: PenElementBarWrapperProps) {
  const [sizeRef, { width: barWidth }] = useMeasure<HTMLDivElement>();
  const {
    containerDimensions: { width: canvasWidth },
  } = useSvgScaleContext();

  const left = clamp((canvasWidth - barWidth) / 2, 0, canvasWidth - barWidth);

  return (
    <Box
      ref={sizeRef}
      position="absolute"
      zIndex={(theme) => theme.zIndex.appBar}
      left={left}
      bottom={(theme) =>
        `calc(${theme.spacing(1)} + ${bottomOffset}px + ${theme.spacing(1)})`
      }
      sx={{ pointerEvents: 'initial' }}
    >
      <PenElementBar />
    </Box>
  );
}
