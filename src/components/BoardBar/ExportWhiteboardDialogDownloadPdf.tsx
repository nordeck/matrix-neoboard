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
import { Tooltip, Typography } from '@mui/material';
import { unstable_useId as useId, visuallyHidden } from '@mui/utils';
import { getLogger } from 'loglevel';
import { Dispatch, PropsWithChildren, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useActiveWhiteboardInstance } from '../../state';
import { useGetRoomNameQuery, useUserDetails } from '../../store';
import { createWhiteboardPdf } from './pdf';

export function ExportWhiteboardDialogDownloadPdf({
  children,
  error,
  onClick,
  onError,
}: PropsWithChildren<{
  error?: string;
  onClick: () => void;
  onError?: Dispatch<string | undefined>;
}>) {
  const { t } = useTranslation();

  const { data: roomNameStateEvent } = useGetRoomNameQuery();
  const roomName = roomNameStateEvent?.event?.content.name ?? 'NeoBoard';

  const downloadUrl = useGeneratePdf(roomName, onError);

  const descriptionId = useId();
  const description = t(
    'boardBar.exportWhiteboardDialog.notAccessibleTooltip',
    'The provided PDF is currently not accessible and can not be read using a screen reader.',
  );
  return (
    <>
      <Typography aria-hidden id={descriptionId} sx={visuallyHidden}>
        {description}
      </Typography>

      <Tooltip
        describeChild
        title={
          // This fragment is intentional, so that the tooltip doesn't apply the
          // description as a title to the link. Instead we want the text inside
          // the link to be the accessible name.
          <>{description}</>
        }
      >
        <LoadingButton
          aria-describedby={descriptionId}
          component="a"
          disabled={!!error}
          download={`${roomName}.pdf`}
          loading={!downloadUrl && !error}
          href={downloadUrl}
          onClick={onClick}
          startIcon={<FileDownloadIcon />}
          target="_blank"
          variant="contained"
        >
          {children}
        </LoadingButton>
      </Tooltip>
    </>
  );
}

function useGeneratePdf(
  roomName: string,
  onError?: Dispatch<string | undefined>,
) {
  const { t } = useTranslation();
  const widgetApi = useWidgetApi();

  const [downloadUrl, setDownloadUrl] = useState<string>();
  const whiteboardInstance = useActiveWhiteboardInstance();

  const { getUserDisplayName } = useUserDetails();

  useEffect(() => {
    let url: string | undefined = undefined;

    setDownloadUrl(undefined);
    onError?.(undefined);

    const authorName = widgetApi.widgetParameters.userId
      ? getUserDisplayName(widgetApi.widgetParameters.userId)
      : '';

    const subscription = createWhiteboardPdf({
      whiteboardInstance,
      roomName,
      authorName,
    }).subscribe({
      next: (blob) => {
        url = URL.createObjectURL(blob);
        setDownloadUrl(url);
      },
      error: (e) => {
        const logger = getLogger('ExportWhiteboardDialogDownloadPdf');
        logger.error('Error while generating the PDF', e);
        onError?.(
          t(
            'boardBar.exportWhiteboardDialog.pdfError',
            'Something went wrong while generating the PDF.',
          ),
        );
      },
    });

    return () => {
      subscription.unsubscribe();
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [
    getUserDisplayName,
    onError,
    roomName,
    t,
    whiteboardInstance,
    widgetApi.widgetParameters.userId,
  ]);

  return downloadUrl;
}
