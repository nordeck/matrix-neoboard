/*
 * Copyright 2022 Nordeck IT + Consulting GmbH
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
import { PropsWithChildren } from 'react';
import { isInfiniteCanvasMode } from '../../lib';
import {
  useFrameElement,
  useIsWhiteboardLoading,
  useSlideElementIds,
} from '../../state';
import { whiteboardHeight, whiteboardWidth } from './constants';
import ConnectedElement from './Element/ConnectedElement';
import { SlideSkeleton } from './SlideSkeleton';
import { SvgCanvas, ViewBox } from './SvgCanvas';
import { SvgScaleContextProvider } from './SvgScaleContext';

export function SlidePreview({
  frameElementId,
}: PropsWithChildren<{ frameElementId?: string }>) {
  const { loading } = useIsWhiteboardLoading();
  const elementIds = useSlideElementIds();
  const frameElement = useFrameElement(frameElementId);

  let viewBox: ViewBox | undefined;

  if (isInfiniteCanvasMode() && frameElement) {
    // Calculate viewBox to show the frame
    const {
      position: { x, y },
      width: elementWidth,
      height: elementHeight,
    } = frameElement;

    const newScale = Math.min(
      whiteboardWidth / elementWidth,
      whiteboardHeight / elementHeight,
    );
    const viewBoxWidth = whiteboardWidth / newScale;
    const viewBoxHeight = whiteboardHeight / newScale;
    const viewBoxMinX = x + elementWidth / 2 - viewBoxWidth / 2;
    const viewBoxMinY = y + elementHeight / 2 - viewBoxHeight / 2;

    viewBox = {
      minX: viewBoxMinX,
      minY: viewBoxMinY,
      width: viewBoxWidth,
      height: viewBoxHeight,
    };
  }

  return (
    <Box width={'100%'}>
      {loading ? (
        <SlideSkeleton />
      ) : (
        <SvgScaleContextProvider>
          <SvgCanvas
            viewportWidth={whiteboardWidth}
            viewportHeight={whiteboardHeight}
            viewBox={viewBox}
            preview={true}
          >
            {elementIds.map((e) => {
              return <ConnectedElement id={e} key={e} readOnly />;
            })}
          </SvgCanvas>
        </SvgScaleContextProvider>
      )}
    </Box>
  );
}
