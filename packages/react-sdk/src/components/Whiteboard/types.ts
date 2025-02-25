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

import { TextAlignment } from '../../state';
import { TextFontFamily } from '../../state/crdt/documents/elements';

/** Common properties of elements that describes the rendering */
export type ElementRenderProperties = {
  /** The color of the stroke */
  strokeColor?: string;
  /** The width of the stroke */
  strokeWidth: number;
  /** Horizontal corner radius */
  rx?: number;

  /**
   * Properties for the text field is displayed on top of the element. Positions
   * are absolute coordinates in the canvas.
   */
  text?: {
    position: { x: number; y: number };
    width: number;
    height: number;
    alignment: TextAlignment;
    bold: boolean;
    italic: boolean;
    fontSize?: number;
    fontFamily: TextFontFamily;
  };
};
