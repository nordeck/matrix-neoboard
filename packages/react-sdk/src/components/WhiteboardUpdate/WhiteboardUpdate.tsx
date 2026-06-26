/*
 * Copyright 2026 Nordeck IT + Consulting GmbH
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

import { getLogger } from 'loglevel';
import { ReactElement, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useActiveWhiteboardInstance,
  useWhiteboardMismatchedSnapshotDetails,
} from '../../state';
import { ExportWhiteboardDialogDownloadFile } from '../BoardBar';
import { WhiteboardUpdateDialog } from './WhiteboardUpdateDialog';

type WhiteboardUpdateProps = {
  dialogAdditionalButtons?: ReactElement;
};

export function WhiteboardUpdate({
  dialogAdditionalButtons,
}: WhiteboardUpdateProps) {
  const { t } = useTranslation('neoboard');
  const logger = getLogger('WhiteboardUpdate');

  const [open, setOpen] = useState(false);
  const [canUpdate, setCanUpdate] = useState(false);

  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdated, setIsUpdated] = useState(false);
  const [isError, setIsError] = useState(false);

  const whiteboardInstance = useActiveWhiteboardInstance();
  const mismatchedSnapshotDetails = useWhiteboardMismatchedSnapshotDetails();

  const resetState = useCallback(() => {
    setIsDownloaded(false);
    setIsUpdated(false);
    setIsError(false);
  }, []);

  useEffect(() => {
    setOpen(mismatchedSnapshotDetails !== undefined);
    setCanUpdate(mismatchedSnapshotDetails?.canUpdate === true);
    if (mismatchedSnapshotDetails !== undefined) {
      resetState();
    }
  }, [mismatchedSnapshotDetails, resetState]);

  const handleDownload = useCallback(async () => {
    setIsDownloaded(true);
  }, []);

  const handleUpdate = useCallback(async () => {
    setIsLoading(true);
    try {
      whiteboardInstance.mergeMismatchedSnapshot();
    } catch (err) {
      logger.error('Cannot update slides to frames', err);
      setIsError(true);
    } finally {
      setIsLoading(false);
      setIsUpdated(true);
    }
  }, [logger, whiteboardInstance]);

  return (
    <WhiteboardUpdateDialog
      open={open}
      canUpdate={canUpdate}
      isUpdateDisabled={!isDownloaded}
      isLoading={isLoading || (isUpdated && !isError)}
      isError={isError}
      onUpdate={handleUpdate}
      exportButton={
        <ExportWhiteboardDialogDownloadFile
          onClick={handleDownload}
          buttonVariant="outlined"
          resetLoadingOnDownload
        >
          {t('boardBar.exportWhiteboardDialog.download', 'Download')}
        </ExportWhiteboardDialogDownloadFile>
      }
      additionalButtons={dialogAdditionalButtons}
    />
  );
}
