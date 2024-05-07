/*
 * Copyright 2023 Nordeck IT + Consulting GmbH
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
import { CSSProperties, forwardRef } from 'react';
import { useActiveWhiteboardInstanceStatistics } from '../../state';
import { CommunicationChannelStatisticsView } from './CommunicationChannelStatisticsView';
import { DocumentSyncStatisticsView } from './DocumentSyncStatisticsView';

export const DeveloperTools = forwardRef<
  HTMLDivElement,
  { style?: CSSProperties }
>(({ style }, ref) => {
  const { document, communicationChannel } =
    useActiveWhiteboardInstanceStatistics();

  return (
    <Box
      ref={ref}
      component="aside"
      width={300}
      height="100%"
      sx={{ overflowY: 'auto' }}
      ml={1}
      bgcolor="background.default"
      borderRadius={1}
      style={style}
    >
      <DocumentSyncStatisticsView document={document} />
      <CommunicationChannelStatisticsView
        communicationChannel={communicationChannel}
      />
    </Box>
  );
});
