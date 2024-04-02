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

import { useWidgetApi } from '@matrix-widget-toolkit/react';
import { useCallback, useEffect, useState } from 'react';

/** Fallback to a max upload size of 100 MiB */
export const fallbackMaxUploadSize = 104857600;

export function useMaxUploadSize(): { maxUploadSizeBytes: number } {
  const widgetApi = useWidgetApi();
  const [maxUploadSizeBytes, setMaxUploadSizeBytes] = useState(
    fallbackMaxUploadSize,
  );

  const loadMaxUploadSize = useCallback(async () => {
    try {
      const mediaConfig = await widgetApi.getMediaConfig();

      if (mediaConfig['m.upload.size'] !== undefined) {
        setMaxUploadSizeBytes(mediaConfig['m.upload.size']);
      }
    } catch (error) {
      console.error('Error loading max upload size', error);
    }
  }, [setMaxUploadSizeBytes, widgetApi]);

  useEffect(() => {
    loadMaxUploadSize();
  }, [loadMaxUploadSize]);

  return {
    maxUploadSizeBytes,
  };
}
