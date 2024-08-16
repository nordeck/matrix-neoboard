/*
 * Copyright 2024 Nordeck IT + Consulting GmbH
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

/**
 * Determines the size of an image.
 *
 * @param imageData - ArrayBuffer holding the image data
 * @returns A promise that resolves to the image size.
 *          On error the promise is rejected.
 */
export async function determineImageSize(
  imageData: ArrayBuffer,
  type: string,
): Promise<{ width: number; height: number }> {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();

    const handleLoad = () => {
      image.removeEventListener('error', handleError);
      URL.revokeObjectURL(image.src);

      let width = image.width;
      let height = image.height;
      // Ensure the if this is an SVG image the minimum shortest side is 400px
      if (type === 'image/svg+xml' && width === 0 && height === 0) {
        // The ratio cant be calculated if both dimensions are 0
        // See also https://github.com/whatwg/html/issues/3510 on why it is important to actually render it on the DOM to move on
        // If the image is not rendered on the DOM the image will not be loaded and the dimensions will be 0.

        // Needed to calculate the aspect ratio
        image.width = 1000;
        // Position fixed so that the image doesn't affect layout while rendering
        image.style.position = 'fixed';
        // Make invisible so the image doesn't briefly appear on the screen
        image.style.opacity = '0';

        document.body.appendChild(image);
        const aspectRatio = image.width / image.height;
        image.removeAttribute('width');
        image.style.removeProperty('position');
        image.style.removeProperty('opacity');

        const minSize = 400;
        // Calculate the new dimensions based on the aspect ratio
        if (aspectRatio > 1) {
          width = minSize;
          height = minSize / aspectRatio;
        } else {
          width = minSize * aspectRatio;
          height = minSize;
        }

        // Remove the image from the DOM again to not clutter it
        image.remove();
      }

      resolve({ width: width, height: height });
    };
    const handleError = () => {
      image.removeEventListener('load', handleLoad);
      URL.revokeObjectURL(image.src);
      reject();
    };
    image.addEventListener('error', handleError, { once: true });
    image.addEventListener('load', handleLoad, { once: true });

    image.src = URL.createObjectURL(new Blob([imageData], { type }));
  });
}
