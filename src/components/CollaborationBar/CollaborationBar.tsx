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

import { useTranslation } from 'react-i18next';
import { usePresentationMode } from '../../state';
import { Toolbar } from '../common/Toolbar';
import { Collaborators } from './Collaborators';
import { ShowCollaboratorsCursorsToggle } from './ShowCollaboratorsCursorsToggle';

export function CollaborationBar() {
  const { t } = useTranslation();
  const { state } = usePresentationMode();
  const isCollaboratorsCursorsActive =
    state.type === 'idle' || state.isEditMode;
  const isPresenting = state.type === 'presenting';
  const isViewingPresentation = state.type === 'presentation';
  const isCollaborationBarActive =
    state.type === 'idle' ||
    isPresenting ||
    (isViewingPresentation && state.isEditMode);
  const toolbarTitle = t('collaborationBar.title', 'Collaboration');

  return (
    isCollaborationBarActive && (
      <Toolbar
        aria-label={toolbarTitle}
        sx={{ pointerEvents: 'initial' }}
        data-guided-tour-target="collaborationbar"
      >
        {isCollaboratorsCursorsActive && <ShowCollaboratorsCursorsToggle />}
        {!isViewingPresentation && <Collaborators />}
      </Toolbar>
    )
  );
}
