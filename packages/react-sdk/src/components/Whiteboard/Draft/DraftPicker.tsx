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

import { ReactElement } from 'react';
import { useLayoutState } from '../../Layout';
import EllipseDraft from '../../elements/ellipse/Draft';
import LineDraft from '../../elements/line/Draft';
import PolylineDraft from '../../elements/polyline/Draft';
import RectangleDraft from '../../elements/rectangle/Draft';
import TriangleDraft from '../../elements/triangle/Draft';

export const DraftPicker = (): ReactElement | null => {
  const { activeTool } = useLayoutState();

  switch (activeTool) {
    case 'select':
      return null;

    case 'text':
      return <RectangleDraft fixedColor="transparent" />;

    case 'ellipse':
      return <EllipseDraft />;

    case 'line':
      return <LineDraft />;

    case 'arrow':
      return <LineDraft endMarker="arrow-head-line" />;

    case 'polyline':
      return <PolylineDraft />;

    case 'rectangle':
      return <RectangleDraft />;

    case 'rounded-rectangle':
      return <RectangleDraft rounded={true} />;

    case 'triangle':
      return <TriangleDraft />;

    case 'sticky-note':
      return <RectangleDraft />;
  }
};
