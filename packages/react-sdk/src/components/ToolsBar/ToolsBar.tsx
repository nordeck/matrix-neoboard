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
import NorthEastIcon from '@mui/icons-material/NorthEast';
import SquareIcon from '@mui/icons-material/Square';
import TitleRoundedIcon from '@mui/icons-material/TitleRounded';
import { ChangeEvent, ReactElement, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { isInfiniteCanvasMode } from '../../lib';
import { useSlideIsLocked, useWhiteboardSlideInstance } from '../../state';
import { Toolbar, ToolbarButton, ToolbarRadioGroup } from '../common/Toolbar';
import { ToolbarRadio } from '../common/Toolbar/ToolbarRadio';
import { CursorDefaultIcon } from '../icons/CursorDefaultIcon';
import { LineIcon } from '../icons/LineIcon';
import { RoundedSquareIcon } from '../icons/RoundedSquareIcon';
import { StickyNoteIcon } from '../icons/StickyNoteIcon';
import { TriangleIcon } from '../icons/TriangleIcon';
import { UploadIcon } from '../icons/UploadIcon';
import { useSlideImageUpload } from '../ImageUpload';
import { ActiveTool, useLayoutState } from '../Layout';
import { FrameButton } from './FrameButton';

export function ToolsBar() {
  const { t } = useTranslation('neoboard');
  const isLocked = useSlideIsLocked();
  const slide = useWhiteboardSlideInstance();
  const { activeTool, setActiveTool } = useLayoutState();

  const handleRadioClick = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (event.target.checked) {
        setActiveTool(event.target.value as ActiveTool);
        // Clear active elements, so that when using a tool the active elements are not in the way
        slide.setActiveElementIds([]);
      }
    },
    [setActiveTool, slide],
  );

  const tools: Array<{ label: string; icon: ReactElement; value: ActiveTool }> =
    [
      {
        label: t('toolsBar.selectTool', 'Select'),
        icon: <CursorDefaultIcon />,
        value: 'select',
      },
      {
        label: t('toolsBar.stickyNote', 'Sticky note'),
        icon: <StickyNoteIcon />,
        value: 'sticky-note',
      },
      {
        label: t('toolsBar.roundedRectangleTool', 'Rounded rectangle'),
        icon: <RoundedSquareIcon />,
        value: 'rounded-rectangle',
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
        label: t('toolsBar.arrowTool', 'Arrow'),
        icon: <NorthEastIcon />,
        value: 'arrow',
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
  const { getRootProps, getInputProps } = useSlideImageUpload({ noDrag: true });

  return (
    <>
      {/* We are hiding it for screen readers and instead expect the button to be used */}
      <input aria-hidden={true} {...getInputProps()} onClick={undefined} />
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
          {isInfiniteCanvasMode() && <FrameButton />}
          <ToolbarButton
            aria-label={t('toolsBar.imageUploadTool', 'Upload image')}
            disabled={isLocked}
            {...getRootProps()}
            // This must be button and it MUST be after getRootProps as the dropzone would otherwise set it to the "presentation" role
            // However in this case we want it to be a button
            role="button"
          >
            <UploadIcon sx={{ height: 22 }} />
          </ToolbarButton>
        </ToolbarRadioGroup>
      </Toolbar>
    </>
  );
}
