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

import AssistantIcon from '@mui/icons-material/Assistant';
import { useCallback, useState } from 'react';
import { ToolbarButton } from '../common/Toolbar';
import { AIAssistantDialog } from './AIAssistantDialog';

export function AIAssistantButton() {
  const [showDialog, setShowDialog] = useState(false);

  const handleDialogOpen = useCallback(() => {
    setShowDialog(true);
  }, []);

  const handleDialogClose = useCallback(() => {
    setShowDialog(false);
  }, []);

  return (
    <>
      <AIAssistantDialog open={showDialog} onClose={handleDialogClose} />
      <ToolbarButton onClick={handleDialogOpen}>
        <AssistantIcon />
      </ToolbarButton>
    </>
  );
}
