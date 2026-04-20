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
import { isInfiniteCanvasMode } from '../../lib';
import {
  useActiveWhiteboardInstance,
  useWhiteboardSlideIds,
} from '../../state';
import { ExportWhiteboardDialogDownloadFile } from '../BoardBar';
import {
  frameHeight,
  frameWidth,
  whiteboardHeight,
  whiteboardWidth,
} from '../Whiteboard';
import { SlidesMigrationDialog } from './SlidesMigrationDialog';

type SlidesMigrationProps = {
  dialogAdditionalButtons?: ReactElement;
};

export function SlidesMigration({
  dialogAdditionalButtons,
}: SlidesMigrationProps) {
  const { t } = useTranslation('neoboard');
  const logger = getLogger('SlidesMigration');

  const [open, setOpen] = useState(false);

  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMigrated, setIsMigrated] = useState(false);
  const [isError, setIsError] = useState(false);

  const whiteboardInstance = useActiveWhiteboardInstance();
  const slideIds = useWhiteboardSlideIds();

  const resetState = useCallback(() => {
    setIsDownloaded(false);
    setIsMigrated(false);
    setIsError(false);
  }, []);

  useEffect(() => {
    if (!isInfiniteCanvasMode()) {
      return;
    }

    setOpen(slideIds.length > 1);
    if (slideIds.length > 1) {
      resetState();
    }
  }, [slideIds, resetState]);

  const handleDownload = useCallback(async () => {
    setIsDownloaded(true);
  }, []);

  const handleMigration = useCallback(async () => {
    setIsLoading(true);
    try {
      whiteboardInstance.transformSlidesToFrames({
        whiteboardWidth,
        whiteboardHeight,
        frameWidth,
        frameHeight,
      });
    } catch (err) {
      logger.error('Cannot migrate slides to to frames', err);
      setIsError(true);
    } finally {
      setIsLoading(false);
      setIsMigrated(true);
    }

    whiteboardInstance.clearUndoManager();
  }, [logger, whiteboardInstance]);

  return (
    <SlidesMigrationDialog
      open={open}
      isMigrationDisabled={!isDownloaded}
      isLoading={isLoading || (isMigrated && !isError)}
      isError={isError}
      onMigrate={handleMigration}
      additionalButtons={
        <>
          {dialogAdditionalButtons}
          <ExportWhiteboardDialogDownloadFile
            onClick={handleDownload}
            buttonVariant="outlined"
            resetLoadingOnDownload
          >
            {t('boardBar.exportWhiteboardDialog.download', 'Download')}
          </ExportWhiteboardDialogDownloadFile>
        </>
      }
    />
  );
}
