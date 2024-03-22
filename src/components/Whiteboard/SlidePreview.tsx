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
import { ConnectedElement } from './Element';
import { SlideSkeleton } from './SlideSkeleton';
import { SvgCanvas } from './SvgCanvas';
import { whiteboardHeight, whiteboardWidth } from './constants';

export function SlidePreview() {
  const { loading } = useIsWhiteboardLoading();
  const elementIds = useSlideElementIds();

  return (
    <Box width={'100%'}>
      {loading ? (
        <SlideSkeleton />
      ) : (
        <SvgCanvas
          viewportHeight={whiteboardHeight}
          viewportWidth={whiteboardWidth}
        >
          {elementIds.map((e) => {
            return (
              <ConnectedElement
                id={e}
                key={e}
                readOnly
                elementIds={[]}
                overrides={{}}
              />
            );
          })}
        </SvgCanvas>
      )}
    </Box>
  );
}
