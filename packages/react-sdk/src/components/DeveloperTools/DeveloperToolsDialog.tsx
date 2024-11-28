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

import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material';
import { unstable_useId as useId } from '@mui/utils';
import { useTranslation } from 'react-i18next';
import { useActiveWhiteboardInstanceStatistics } from '../../state';
import { CommunicationChannelStatisticsView } from './CommunicationChannelStatisticsView';
import { DocumentSyncStatisticsView } from './DocumentSyncStatisticsView';

export function DeveloperToolsDialog({
  open,
  handleClose,
}: {
  open: boolean;
  handleClose: () => void;
}) {
  const { t } = useTranslation('neoboard');

  const { document, communicationChannel } =
    useActiveWhiteboardInstanceStatistics();

  const dialogTitleId = useId();
  const dialogDescriptionId = useId();

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="md"
      aria-labelledby={dialogTitleId}
      aria-describedby={dialogDescriptionId}
    >
      <DialogTitle
        id={dialogTitleId}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="h6">
          {t('boardBar.developerToolsDialog.title', 'Developer Tools')}
        </Typography>
        <IconButton
          aria-label={t(
            'boardBar.developerToolsDialog.closeAriaLabel',
            'Close',
          )}
          onClick={handleClose}
          style={{ marginLeft: 'auto' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent
        dividers
        style={{ padding: 16, overflowY: 'auto' }}
        id={dialogDescriptionId}
      >
        <Box>
          <Accordion>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="document-sync-content"
              id="document-sync-header"
            >
              <Typography variant="subtitle1">
                {t(
                  'boardBar.developerToolsDialog.documentSyncStatisticsTitle',
                  'Document Sync Statistics (Snapshots)',
                )}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <DocumentSyncStatisticsView document={document} />
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="communication-channel-content"
              id="communication-channel-header"
            >
              <Typography variant="subtitle1">
                {t(
                  'boardBar.developerToolsDialog.communicationChannelStatisticsTitle',
                  'Communication Channel Statistics (WRTC)',
                )}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <CommunicationChannelStatisticsView
                communicationChannel={communicationChannel}
              />
            </AccordionDetails>
          </Accordion>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
