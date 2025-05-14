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

import AutorenewIcon from '@mui/icons-material/Autorenew';
import { SelectChangeEvent } from '@mui/material';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useActiveElements,
  useElements,
  useWhiteboardSlideInstance,
} from '../../../state';
import { LineMarker } from '../../../state/crdt/documents/elements';
import { ToolbarRadio } from '../../common/Toolbar';
import { useLayoutState } from '../../Layout';
import { lineMarkerChanges, lineMarkerSwitch } from './lineMarkerChanges';
import { LineMarkerSelect } from './LineMarkerSelect';

export function LineMarkerButtons() {
  const { t } = useTranslation('neoboard');
  const { setActiveStartLineMarker, setActiveEndLineMarker } = useLayoutState();
  const { activeElementIds } = useActiveElements();
  const elements = useElements(activeElementIds);
  const slideInstance = useWhiteboardSlideInstance();

  let startMarker: LineMarker | undefined;
  let endMarker: LineMarker | undefined;
  let hasLineElement = false;

  const handleSwitchClick = useCallback(
    (startMarker?: LineMarker, endMarker?: LineMarker) => {
      const updates = lineMarkerSwitch(elements);

      if (updates.length > 0) {
        slideInstance.updateElements(updates);
      }

      if (startMarker !== endMarker) {
        setActiveStartLineMarker(endMarker);
        setActiveEndLineMarker(startMarker);
      }
    },
    [elements, slideInstance, setActiveStartLineMarker, setActiveEndLineMarker],
  );

  const handleMarkerChange = useCallback(
    (position: 'start' | 'end', event: SelectChangeEvent<string>) => {
      const markerValue = event.target.value as LineMarker;
      const updates = lineMarkerChanges(position, elements, markerValue);

      if (updates.length > 0) {
        slideInstance.updateElements(updates);
      }

      if (position === 'start') {
        setActiveStartLineMarker(markerValue);
        setActiveEndLineMarker(endMarker);
      } else {
        setActiveStartLineMarker(startMarker);
        setActiveEndLineMarker(markerValue);
      }

      // If both markers are none/undefined, set the default arrow end marker
      const otherMarker = position === 'start' ? endMarker : startMarker;
      if (event.target.value === 'none' && otherMarker === undefined) {
        setActiveEndLineMarker('arrow-head-line');
      }
    },
    [
      elements,
      slideInstance,
      setActiveStartLineMarker,
      setActiveEndLineMarker,
      startMarker,
      endMarker,
    ],
  );

  // get first selected element markers, if any
  for (const element of Object.values(elements)) {
    if (element.type === 'path' && element.kind === 'line') {
      hasLineElement = true;
      startMarker = element.startMarker;
      endMarker = element.endMarker;
      break;
    }
  }

  if (!hasLineElement) {
    return null;
  }

  return (
    <>
      <LineMarkerSelect
        position="start"
        marker={startMarker}
        onChangeMarker={(event) => handleMarkerChange('start', event)}
        inputProps={{
          'aria-label': t('elementBar.lineStart', 'Line Start'),
        }}
      />
      <ToolbarRadio
        inputProps={{
          'aria-label': t('elementBar.lineMarkerSwitch', 'Line Marker Switch'),
          onClick: () => handleSwitchClick(startMarker, endMarker),
        }}
        icon={<AutorenewIcon />}
        value={'center'}
        checked={false}
      />
      <LineMarkerSelect
        position="end"
        marker={endMarker}
        onChangeMarker={(event) => handleMarkerChange('end', event)}
        inputProps={{
          'aria-label': t('elementBar.lineEnd', 'Line End'),
        }}
      />
    </>
  );
}
