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
import {
  PropsWithChildren,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { download } from '../../lib';
import { useActiveWhiteboardInstance } from '../../state';
import { useGetRoomNameQuery } from '../../store';

export function ExportWhiteboardDialogDownloadFile({
  children,
  onAfterDownload,
}: PropsWithChildren<{ onAfterDownload: () => void }>) {
  const { data: roomNameStateEvent } = useGetRoomNameQuery();
  const roomName = roomNameStateEvent?.event?.content.name ?? 'NeoBoard';
  const [shouldDownload, setShouldDownload] = useState(false);
  const downloadUrl = useGenerateFile(shouldDownload);
  const downloaded = useRef<boolean>(false);

  const handleClick = useCallback(() => {
    setShouldDownload(true);
  }, [setShouldDownload]);

  useEffect(() => {
    if (!downloaded.current && downloadUrl) {
      download(downloadUrl, roomName, '_blank');
      // make sure to download only once
      downloaded.current = true;
      onAfterDownload();
    }
  }, [downloadUrl, onAfterDownload, roomName]);

  return (
    <LoadingButton
      loading={shouldDownload}
      onClick={handleClick}
      startIcon={<FileDownloadIcon />}
      variant="contained"
    >
      {children}
    </LoadingButton>
  );
}

function useGenerateFile(shouldDownload: boolean): string | undefined {
  const [downloadUrl, setDownloadUrl] = useState<string>();
  const whiteboardInstance = useActiveWhiteboardInstance();
  const widgetApi = useWidgetApi();
  const unmounted = useRef<boolean>(false);

  useEffect(() => {
    if (!shouldDownload) {
      return;
    }

    setDownloadUrl(undefined);
    let url: string;

    const doExport = async () => {
      const whiteboardContent = await whiteboardInstance.export(
        // Just pass an empty base URL here as a fallback.
        // It will be handled in the export function.
        widgetApi.widgetParameters.baseUrl ?? '',
      );
      const blob = new Blob([JSON.stringify(whiteboardContent)]);
      url = URL.createObjectURL(blob);

      if (!unmounted.current) {
        setDownloadUrl(url);
      }
    };

    doExport();

    return () => {
      unmounted.current = true;

      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [shouldDownload, whiteboardInstance, widgetApi.widgetParameters.baseUrl]);

  return downloadUrl;
}
