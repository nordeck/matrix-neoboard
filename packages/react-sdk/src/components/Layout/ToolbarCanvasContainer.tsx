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
import React, { PropsWithChildren } from 'react';
import { whiteboardHeight, whiteboardWidth } from '../Whiteboard';

/**
 * Absolute positioned container, with the same size as the canvas.
 */
export const ToolbarCanvasContainer: React.FC<PropsWithChildren<{}>> =
  function ({ children }) {
    return (
      <Box
        sx={{
          aspectRatio: whiteboardWidth / whiteboardHeight,
          left: 0,
          maxHeight: '100%',
          pointerEvents: 'none',
          position: 'absolute',
          top: 0,
          width: '100%',
        }}
      >
        {children}
      </Box>
    );
  };
