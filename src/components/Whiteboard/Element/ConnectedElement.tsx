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

import { first } from 'lodash';
import { useActiveElements } from '../../../state';
import { useElementOverride } from '../../ElementOverridesProvider';
import EllipseDisplay from '../../elements/ellipse/Display';
import LineDisplay from '../../elements/line/Display';
import PolylineDisplay from '../../elements/polyline/Display';
import RectangleDisplay from '../../elements/rectangle/Display';
import TriangleDisplay from '../../elements/triangle/Display';

export const ConnectedElement = ({
  id,
  readOnly = false,
}: {
  id: string;
  readOnly?: boolean;
}) => {
  const { activeElementIds } = useActiveElements();
  const element = useElementOverride(id);
  const activeElementId = first(activeElementIds);
  const isActive = !readOnly && id ? activeElementId === id : false;
  const otherProps = {
    // TODO: Align names
    active: isActive,
    readOnly,
    elementId: id,
  };

  if (element) {
    if (element.type === 'path') {
      if (element.kind === 'line') {
        return <LineDisplay {...element} {...otherProps} />;
      } else if (element.kind === 'polyline') {
        return <PolylineDisplay {...element} {...otherProps} />;
      }
    } else if (element.type === 'shape') {
      if (element.kind === 'circle' || element.kind === 'ellipse') {
        return <EllipseDisplay {...element} {...otherProps} />;
      } else if (element.kind === 'rectangle') {
        return <RectangleDisplay {...element} {...otherProps} />;
      } else if (element.kind === 'triangle') {
        return <TriangleDisplay {...element} {...otherProps} />;
      }
    }
  }

  return null;
};
