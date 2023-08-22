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

import VisibilityIcon from '@mui/icons-material/Visibility';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLayoutState } from '../Layout';
import { ToolbarToggle } from '../common/Toolbar';

export function ShowCollaboratorsCursorsToggle() {
  const { t } = useTranslation();
  const { isShowCollaboratorsCursors, setShowCollaboratorsCursors } =
    useLayoutState();
  const title = isShowCollaboratorsCursors
    ? t(
        'collaborationBar.hideCollaboratorsCursors',
        "Hide collaborators' cursors"
      )
    : t(
        'collaborationBar.showCollaboratorsCursors',
        "Show collaborators' cursors"
      );

  const handleChange = useCallback(
    (_, checked: boolean) => {
      setShowCollaboratorsCursors(checked);
    },
    [setShowCollaboratorsCursors]
  );

  return (
    <ToolbarToggle
      inputProps={{ 'aria-label': title }}
      checked={isShowCollaboratorsCursors}
      icon={<VisibilityIcon />}
      checkedIcon={<VisibilityIcon />}
      onChange={handleChange}
    />
  );
}
