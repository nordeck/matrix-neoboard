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

import { useWidgetApi } from '@matrix-widget-toolkit/react';
import React, { JSX } from 'react';
import { Elements, useElement } from '../../../state';
import { useConnectionPoint } from '../../ConnectionPointProvider';
import {
  ElementOverride,
  mergeElementAndOverride,
} from '../../ElementOverridesProvider';
import EllipseDisplay from '../../elements/ellipse/Display';
import FrameDisplay from '../../elements/frame/Display';
import ImageDisplay from '../../elements/image/ImageDisplay';
import LineDisplay from '../../elements/line/Display';
import PolylineDisplay from '../../elements/polyline/Display';
import RectangleDisplay from '../../elements/rectangle/Display';
import TriangleDisplay from '../../elements/triangle/Display';
import {
  ConnectableElement,
  ConnectableElementProps,
} from '../ElementBehaviors';

const ConnectedElement = ({
  id,
  readOnly = false,
  override,
  activeElementIds = [],
  overrides = {},
  setTextToolsEnabled = () => {},
}: {
  id: string;
  readOnly?: boolean;
  override?: ElementOverride;
  activeElementIds?: string[];
  overrides?: Elements;
  setTextToolsEnabled?: (enabled: boolean) => void;
}) => {
  const widgetApi = useWidgetApi();
  let element = useElement(id);

  const isActive =
    !readOnly && id
      ? activeElementIds.length === 1 && activeElementIds[0] === id
      : false;
  const otherProps = {
    // TODO: Align names
    active: isActive,
    readOnly,
    elementId: id,
    activeElementIds,
    overrides,
  };

  if (element) {
    element = mergeElementAndOverride(element, override);

    if (element.type === 'path') {
      if (element.kind === 'line') {
        return <LineDisplay {...element} {...otherProps} />;
      } else if (element.kind === 'polyline') {
        return <PolylineDisplay {...element} {...otherProps} />;
      }
    } else if (element.type === 'shape') {
      let shapeChild: JSX.Element;

      if (element.kind === 'circle' || element.kind === 'ellipse') {
        shapeChild = (
          <EllipseDisplay
            {...element}
            {...otherProps}
            setTextToolsEnabled={setTextToolsEnabled}
          />
        );
      } else if (element.kind === 'rectangle') {
        shapeChild = (
          <RectangleDisplay
            {...element}
            {...otherProps}
            setTextToolsEnabled={setTextToolsEnabled}
          />
        );
      } else if (element.kind === 'triangle') {
        shapeChild = (
          <TriangleDisplay
            {...element}
            {...otherProps}
            setTextToolsEnabled={setTextToolsEnabled}
          />
        );
      } else {
        throw new Error('unexpected shape kind', element.kind);
      }

      return (
        <>
          {shapeChild}
          {!readOnly && (
            <ConnectableElementWrapper elementId={id} element={element} />
          )}
        </>
      );
    } else if (element.type === 'image') {
      if (widgetApi.widgetParameters.baseUrl === undefined) {
        console.error('Image cannot be rendered due to missing base URL');
        return null;
      }

      return (
        <ImageDisplay
          baseUrl={widgetApi.widgetParameters.baseUrl}
          {...element}
          {...otherProps}
        />
      );
    } else if (element.type === 'frame') {
      return <FrameDisplay {...element} {...otherProps} />;
    }
  }

  return null;
};

function ConnectableElementWrapper({
  elementId,
  element,
}: ConnectableElementProps) {
  const { isHandleDragging } = useConnectionPoint();

  if (!isHandleDragging) {
    return null;
  }

  return <ConnectableElement elementId={elementId} element={element} />;
}

export default React.memo(ConnectedElement);
