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

import { isInfiniteCanvasMode } from '../../lib';
import {
  calculateFittedElementSize,
  clampElementPosition,
  ImageElement,
  modifyElementPosition,
  Point,
  WhiteboardSlideInstance,
} from '../../state';
import { positionImageElements } from '../ImportWhiteboardDialog';
import { whiteboardHeight, whiteboardWidth } from '../Whiteboard';
import { ImageUploadResult } from './ImageUploadProvider';

/**
 * Fit and centre and add images to a slide.
 *
 * @param slide - slide instance
 * @param uploadResult - Information from the image upload
 * @param uploadResult[].mxc - MXC URI of the image {@link https://spec.matrix.org/v1.9/client-server-api/#matrix-content-mxc-uris}
 * @param uploadResult[].fileName - File name
 * @param uploadResult[].imageSize - Image size
 * @param centerPosition - Image center position
 */
export function addImagesToSlide(
  slide: WhiteboardSlideInstance,
  uploadResults: ImageUploadResult[],
  centerPosition: Point,
): void {
  let images: ImageElement[] = [];
  if (isInfiniteCanvasMode()) {
    for (const uploadResult of uploadResults) {
      images.push({
        type: 'image',
        width: uploadResult.size.width / 4,
        height: uploadResult.size.height / 4,
        position: { x: 0, y: 0 },
        mxc: uploadResult.mxc,
        fileName: uploadResult.fileName,
      });

      const {
        elements,
        rect: { offsetX, offsetY, width, height },
      } = positionImageElements(images);
      images = elements;

      const position: Point = {
        x: centerPosition.x - width / 2,
        y: centerPosition.y - height / 2,
      };
      const positionClamp = clampElementPosition(
        position,
        { width, height },
        { width: whiteboardWidth, height: whiteboardHeight },
      );

      images = images.map((element) =>
        modifyElementPosition(element, positionClamp, offsetX, offsetY),
      );
    }
  } else {
    images = uploadResults.map((uploadResult) => {
      const fittedSize = calculateFittedElementSize(uploadResult.size, {
        width: whiteboardWidth,
        height: whiteboardHeight,
      });

      const position: Point = {
        x: centerPosition.x - fittedSize.width / 2,
        y: centerPosition.y - fittedSize.height / 2,
      };

      const positionClamp = clampElementPosition(
        position,
        { width: fittedSize.width, height: fittedSize.height },
        { width: whiteboardWidth, height: whiteboardHeight },
      );

      return {
        type: 'image',
        width: fittedSize.width,
        height: fittedSize.height,
        position: positionClamp,
        mxc: uploadResult.mxc,
        fileName: uploadResult.fileName,
      };
    });
  }
  slide.addElements(images);
}
