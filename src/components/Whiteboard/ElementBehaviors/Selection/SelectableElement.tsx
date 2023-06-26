/*
 * Copyright 2022 Nordeck IT + Consulting GmbH
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

import { MouseEvent, PropsWithChildren } from 'react';
import { useWhiteboardSlideInstance } from '../../../../state';
import { useLayoutState } from '../../../Layout';
import { WithSelectionProps } from './types';

export type SelectableElementProps = PropsWithChildren<WithSelectionProps>;

export function SelectableElement({
  children,
  elementId,
}: SelectableElementProps) {
  const slideInstance = useWhiteboardSlideInstance();
  const { activeTool } = useLayoutState();
  const isInSelectionMode = activeTool === 'select';

  function handleMouseDown(event: MouseEvent) {
    if (isInSelectionMode) {
      event.stopPropagation();
      slideInstance.setActiveElementIds([elementId]);
    }
  }

  return <g onMouseDown={handleMouseDown}>{children}</g>;
}
