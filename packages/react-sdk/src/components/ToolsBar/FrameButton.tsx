/*
 * Copyright 2025 Nordeck IT + Consulting GmbH
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

import { SvgIcon } from '@mui/material';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ToolbarButton } from '../common/Toolbar';
import { useCreateFrame } from './useCreateFrame';

export const FrameButton: React.FC = () => {
  const { t } = useTranslation('neoboard');
  const { createFrame } = useCreateFrame();

  return (
    <ToolbarButton
      aria-label={t('toolsBar.frameTool', 'Create frame')}
      onClick={createFrame}
    >
      <SvgIcon>
        <svg
          width="800px"
          height="800px"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M6 3V21M18 3V21M3 6H21M3 18H21"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </SvgIcon>
    </ToolbarButton>
  );
};
