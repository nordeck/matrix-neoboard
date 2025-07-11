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
import { useIsWhiteboardLoading, useSlideElementIds } from '../../state';
import { whiteboardHeight, whiteboardWidth } from './constants';
import ConnectedElement from './Element/ConnectedElement';
import { SlideSkeleton } from './SlideSkeleton';
import { SvgCanvas } from './SvgCanvas';
import { SvgScaleContextProvider } from './SvgScaleContext';

export function SlidePreview() {
  const { loading } = useIsWhiteboardLoading();
  const elementIds = useSlideElementIds();

  return (
    <Box width={'100%'}>
      {loading ? (
        <SlideSkeleton />
      ) : (
        <SvgScaleContextProvider>
          <SvgCanvas
            viewportHeight={whiteboardHeight}
            viewportWidth={whiteboardWidth}
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
