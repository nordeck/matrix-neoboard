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
      resolve({ width: image.width, height: image.height });
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
