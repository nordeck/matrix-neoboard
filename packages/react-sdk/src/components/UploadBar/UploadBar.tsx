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

import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Toolbar, ToolbarButton } from '../common/Toolbar';

export function UploadBar() {
  const { t } = useTranslation();

  const uploadBar = t('uploadBar.title', 'Upload');
  const title = t('uploadBar.upload', 'Upload');

  const handleUploadClick = useCallback(() => {
    // TODO: implement upload
  }, []);

  return (
    <Toolbar aria-label={uploadBar} sx={{ pointerEvents: 'initial' }}>
      <ToolbarButton
        // TODO: only disable when locked once implemented
        //disabled={isLocked}
        disabled
        aria-label={title}
        onClick={handleUploadClick}
      >
        <UploadFileRoundedIcon />
      </ToolbarButton>
    </Toolbar>
  );
}
