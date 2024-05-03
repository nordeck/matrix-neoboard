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

import { useWidgetApi } from '@matrix-widget-toolkit/react';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { LoadingButton } from '@mui/lab';
import { PropsWithChildren, useCallback, useState } from 'react';
import { useActiveWhiteboardInstance } from '../../../state';
import { useGetRoomNameQuery } from '../../../store';
import { downloadData } from './download';

export function ExportWhiteboardDialogDownloadFile({
  children,
  onClick,
}: PropsWithChildren<{ onClick: () => void }>) {
  const { isDownloading, handleDownloadClick } = useWhiteboardDownload(onClick);

  return (
    <LoadingButton
      loading={isDownloading}
      onClick={handleDownloadClick}
      startIcon={<FileDownloadIcon />}
      variant="contained"
    >
      {children}
    </LoadingButton>
  );
}

function useWhiteboardDownload(onDownloadFinished: () => void) {
  const { data: roomNameStateEvent } = useGetRoomNameQuery();
  const roomName = roomNameStateEvent?.event?.content.name ?? 'NeoBoard';
  const whiteboard = useActiveWhiteboardInstance();
  const [isDownloading, setIsDownloading] = useState(false);
  const widgetApi = useWidgetApi();

  const handleDownloadClick = useCallback(async () => {
    if (widgetApi.widgetParameters.baseUrl === undefined) {
      // this should never happen, because there is a check that baseUrl is defined on start
      throw new Error('baseUrl widget parameter not set');
    }

    setIsDownloading(true);
    const filename = `${roomName}.nwb`;
    const whiteboardData = await whiteboard.export(
      widgetApi.widgetParameters.baseUrl,
    );
    downloadData(filename, whiteboardData);
    onDownloadFinished();
  }, [
    onDownloadFinished,
    roomName,
    whiteboard,
    widgetApi.widgetParameters.baseUrl,
  ]);

  return {
    handleDownloadClick,
    isDownloading,
  };
}
