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

import { Tabs } from '@mui/base';
import { PropsWithChildren, useCallback } from 'react';
import { useActiveSlide, useActiveWhiteboardInstance } from '../../state';

export function SlidesProvider({ children }: PropsWithChildren<{}>) {
  const whiteboardInstance = useActiveWhiteboardInstance();
  const { activeSlideId } = useActiveSlide();

  const handleSelectSlide = useCallback(
    (_: unknown, slideId: string | number | boolean | null) => {
      if (typeof slideId === 'string') {
        whiteboardInstance.setActiveSlideId(slideId);
      }
    },
    [whiteboardInstance],
  );

  return (
    <Tabs
      orientation="vertical"
      value={activeSlideId}
      onChange={handleSelectSlide}
    >
      {children}
    </Tabs>
  );
}
