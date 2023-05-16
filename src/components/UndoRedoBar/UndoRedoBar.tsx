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

import RedoRoundedIcon from '@mui/icons-material/RedoRounded';
import UndoRoundedIcon from '@mui/icons-material/UndoRounded';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useActiveWhiteboardInstance, useUndoRedoState } from '../../state';
import { Toolbar, ToolbarButton } from '../common/Toolbar';

export function UndoRedoBar() {
  const { t } = useTranslation();
  const whiteboardInstance = useActiveWhiteboardInstance();
  const { canUndo, canRedo } = useUndoRedoState();

  const undoRedoBar = t('undoRedoBar.title', 'Undo');
  const undoTitle = t('undoRedoBar.undo', 'Undo');
  const redoTitle = t('undoRedoBar.redo', 'Redo');

  const handleUndoClick = useCallback(() => {
    whiteboardInstance.undo();
  }, [whiteboardInstance]);

  const handleRedoClick = useCallback(() => {
    whiteboardInstance.redo();
  }, [whiteboardInstance]);

  return (
    <Toolbar aria-label={undoRedoBar} sx={{ pointerEvents: 'initial' }}>
      <ToolbarButton
        disabled={!canUndo}
        aria-label={undoTitle}
        onClick={handleUndoClick}
      >
        <UndoRoundedIcon />
      </ToolbarButton>
      <ToolbarButton
        disabled={!canRedo}
        aria-label={redoTitle}
        onClick={handleRedoClick}
      >
        <RedoRoundedIcon />
      </ToolbarButton>
    </Toolbar>
  );
}
