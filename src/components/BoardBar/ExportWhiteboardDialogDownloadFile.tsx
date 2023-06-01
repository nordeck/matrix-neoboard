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

import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { LoadingButton } from '@mui/lab';
import {
  PropsWithChildren,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useActiveWhiteboardInstance } from '../../state';
import { useGetRoomNameQuery } from '../../store';

export function ExportWhiteboardDialogDownloadFile({
  children,
  onClick,
}: PropsWithChildren<{ onClick: () => void }>) {
  const { data: roomNameStateEvent } = useGetRoomNameQuery();
  const roomName = roomNameStateEvent?.event?.content.name ?? 'NeoBoard';

  const downloadUrl = useGenerateFile();

  return (
    <LoadingButton
      component="a"
      download={`${roomName}.nwb`}
      loading={!downloadUrl}
      href={downloadUrl}
      onClick={onClick}
      startIcon={<FileDownloadIcon />}
      target="_blank"
      variant="contained"
    >
      {children}
    </LoadingButton>
  );
}

function useGenerateFile() {
  const [downloadUrl, setDownloadUrl] = useState<string>();
  const whiteboardInstance = useActiveWhiteboardInstance();

  const urlRef = useRef<string | undefined>();
  const revokeUrl = useCallback(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = undefined;
    }
  }, []);

  useEffect(() => {
    const whiteboardContent = whiteboardInstance.export();

    const blob = new Blob([JSON.stringify(whiteboardContent)]);

    const url = URL.createObjectURL(blob);

    urlRef.current = url;
    setDownloadUrl(url);

    return () => {
      revokeUrl();
    };
  }, [revokeUrl, whiteboardInstance]);

  return downloadUrl;
}
