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

import { Box } from '@mui/material';
import { useWhiteboardFirstSlideInstance } from '../../state/useWhiteboardSlideInstance';
import { ConnectedElement } from './Element';
import { SvgCanvas } from './SvgCanvas';
import { whiteboardHeight, whiteboardWidth } from './constants';

export function DocumentPreview() {
  const slideInstance = useWhiteboardFirstSlideInstance();
  const elementIds = slideInstance.getElementIds();

  return (
    <Box id="document-preview" width="0%" visibility="hidden">
      <SvgCanvas
        viewportHeight={whiteboardHeight}
        viewportWidth={whiteboardWidth}
      >
        {elementIds.map((e) => {
          return <ConnectedElement id={e} key={e} readOnly />;
        })}
      </SvgCanvas>
    </Box>
  );
}
