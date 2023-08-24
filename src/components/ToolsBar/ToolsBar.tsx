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

import CircleIcon from '@mui/icons-material/Circle';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import SquareIcon from '@mui/icons-material/Square';
import TitleRoundedIcon from '@mui/icons-material/TitleRounded';
import { ChangeEvent, ReactElement, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSlideIsLocked } from '../../state';
import { ActiveTool, useLayoutState } from '../Layout';
import { Toolbar, ToolbarRadioGroup } from '../common/Toolbar';
import { ToolbarRadio } from '../common/Toolbar/ToolbarRadio';
import { CursorDefaultIcon } from '../icons/CursorDefaultIcon';
import { LineIcon } from '../icons/LineIcon';
import { TriangleIcon } from '../icons/TriangleIcon';

export function ToolsBar() {
  const { t } = useTranslation();
  const isLocked = useSlideIsLocked();
  const { activeTool, setActiveTool } = useLayoutState();

  const handleRadioClick = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (event.target.checked) {
        setActiveTool(event.target.value as ActiveTool);
      }
    },
    [setActiveTool],
  );

  const tools: Array<{ label: string; icon: ReactElement; value: ActiveTool }> =
    [
      {
        label: t('toolsBar.selectTool', 'Select'),
        icon: <CursorDefaultIcon />,
        value: 'select',
      },
      {
        label: t('toolsBar.rectangleTool', 'Rectangle'),
        icon: <SquareIcon />,
        value: 'rectangle',
      },
      {
        label: t('toolsBar.ellipseTool', 'Ellipse'),
        icon: <CircleIcon />,
        value: 'ellipse',
      },
      {
        label: t('toolsBar.triangleTool', 'Triangle'),
        icon: <TriangleIcon />,
        value: 'triangle',
      },
      {
        label: t('toolsBar.lineTool', 'Line'),
        icon: <LineIcon />,
        value: 'line',
      },
      {
        label: t('toolsBar.penTool', 'Pen'),
        icon: <EditRoundedIcon />,
        value: 'polyline',
      },
      {
        label: t('toolsBar.textTool', 'Text'),
        icon: <TitleRoundedIcon />,
        value: 'text',
      },
    ];

  const toolsBarTitle = t('toolsBar.title', 'Tools');

  return (
    <Toolbar
      aria-label={toolsBarTitle}
      sx={{ pointerEvents: 'initial' }}
      data-guided-tour-target="toolsbar"
    >
      <ToolbarRadioGroup flexWrap="wrap" aria-label={toolsBarTitle}>
        {tools.map(({ label, icon, value }) => (
          <ToolbarRadio
            inputProps={{ 'aria-label': label }}
            disabled={isLocked}
            icon={icon}
            checkedIcon={icon}
            key={value}
            value={value}
            checked={activeTool === value && !isLocked}
            onChange={handleRadioClick}
          />
        ))}
      </ToolbarRadioGroup>
    </Toolbar>
  );
}
