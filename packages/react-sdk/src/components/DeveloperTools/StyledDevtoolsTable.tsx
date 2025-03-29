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

import { Paper, Table, TableCell, TableContainer, styled } from '@mui/material';
import { PropsWithChildren } from 'react';

const StyledTable = styled(Table)({
  minWidth: 600,
  borderCollapse: 'collapse',
});

interface StyledTableCellProps {
  monospace?: boolean;
}

const StyledTableCell = styled(TableCell)<StyledTableCellProps>(
  ({ monospace, theme }) => ({
    fontSize: '0.875rem',
    padding: '8px 16px',
    borderBottom: `1px solid ${theme.palette.divider}`,
    '&:not(:last-child)': {
      borderRight: `1px solid ${theme.palette.divider}`,
    },
    ...(monospace ? { fontFamily: 'monospace' } : undefined),
  }),
);

const HeaderCell = styled(StyledTableCell)(({ theme }) => ({
  fontWeight: 'bold',
  backgroundColor: theme.palette.divider,
  textAlign: 'center',
}));

export function StyledDevtoolsTable({
  children,
  ariaLabel,
}: PropsWithChildren<{
  ariaLabel: string;
}>) {
  return (
    <TableContainer component={Paper}>
      <StyledTable aria-label={ariaLabel}>{children}</StyledTable>
    </TableContainer>
  );
}

export function StyledDevtoolsTableCell({
  children,
  colSpan,
  align,
  monospace,
}: PropsWithChildren<{
  colSpan?: number;
  align?: 'inherit' | 'left' | 'center' | 'right' | 'justify';
  monospace?: boolean;
}>) {
  return (
    <StyledTableCell colSpan={colSpan} align={align} monospace={monospace}>
      {children}
    </StyledTableCell>
  );
}

export function StyledDevtoolsHeaderCell({ content }: { content: string }) {
  return <HeaderCell>{content}</HeaderCell>;
}
