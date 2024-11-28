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

import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  styled,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { DocumentSyncStatistics } from '../../state/types';

const StyledTable = styled(Table)({
  minWidth: 600,
  borderCollapse: 'collapse',
});

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  fontSize: '0.875rem',
  padding: '8px 16px',
  borderBottom: `1px solid ${theme.palette.divider}`,
  '&:not(:last-child)': {
    borderRight: `1px solid ${theme.palette.divider}`, // Add vertical divider between cells
  },
}));

const HeaderCell = styled(StyledTableCell)(({ theme }) => ({
  fontWeight: 'bold',
  backgroundColor: theme.palette.divider,
  textAlign: 'center',
}));

export function DocumentSyncStatisticsView({
  document,
}: {
  document: DocumentSyncStatistics | undefined;
}) {
  const { t } = useTranslation('neoboard');

  return (
    <TableContainer component={Paper}>
      <StyledTable
        aria-label={t(
          'boardBar.developerToolsDialog.documentSyncStatistics.tableAriaLabel',
          'Document Sync Statistics',
        )}
      >
        <TableHead>
          <TableRow>
            <HeaderCell>
              {t(
                'boardBar.developerToolsDialog.documentSyncStatistics.binaryJsonSize',
                'Binary / JSON Size (bytes)',
              )}
            </HeaderCell>
            <HeaderCell>
              {t(
                'boardBar.developerToolsDialog.documentSyncStatistics.received',
                'Received',
              )}
            </HeaderCell>
            <HeaderCell>
              {t(
                'boardBar.developerToolsDialog.documentSyncStatistics.send',
                'Send',
              )}
            </HeaderCell>
            <HeaderCell>
              {t(
                'boardBar.developerToolsDialog.documentSyncStatistics.outstanding',
                'Outstanding',
              )}
            </HeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {document ? (
            <TableRow>
              <StyledTableCell align="right">
                {document.documentSizeInBytes} / {document.contentSizeInBytes}
              </StyledTableCell>
              <StyledTableCell align="right">
                {document.snapshotsReceived}
              </StyledTableCell>
              <StyledTableCell align="right">
                {document.snapshotsSend}
              </StyledTableCell>
              <StyledTableCell align="right">
                {document.snapshotOutstanding
                  ? t(
                      'boardBar.developerToolsDialog.documentSyncStatistics.true',
                      'true',
                    )
                  : t(
                      'boardBar.developerToolsDialog.documentSyncStatistics.false',
                      'false',
                    )}
              </StyledTableCell>
            </TableRow>
          ) : (
            <TableRow>
              <StyledTableCell colSpan={4} align="center">
                <Typography variant="body2" color="textSecondary">
                  {t(
                    'boardBar.developerToolsDialog.documentSyncStatistics.noData',
                    'No data available',
                  )}
                </Typography>
              </StyledTableCell>
            </TableRow>
          )}
        </TableBody>
      </StyledTable>
    </TableContainer>
  );
}
