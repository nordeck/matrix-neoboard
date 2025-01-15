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

import {
  calculateCentredPosition,
  calculateFittedElementSize,
  WhiteboardSlideInstance,
} from '../../state';
import { whiteboardHeight, whiteboardWidth } from '../Whiteboard';
import { ImageUploadResult } from './ImageUploadProvider';

export function addImageToSlide(
  slide: WhiteboardSlideInstance,
  uploadResult: ImageUploadResult,
): void {
  const fittedSize = calculateFittedElementSize(uploadResult.size, {
    width: whiteboardWidth,
    height: whiteboardHeight,
  });
  const centredPosition = calculateCentredPosition(fittedSize, {
    width: whiteboardWidth,
    height: whiteboardHeight,
  });
  slide.addElement({
    type: 'image',
    position: centredPosition,
    ...fittedSize,
    mxc: uploadResult.mxc,
    fileName: uploadResult.fileName,
  });
}
