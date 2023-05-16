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

import { useEffect } from 'react';

/**
 * This removes the content from live regions (the rbd announcer).
 *
 * When mui opens a modal dialog, it applied aria-hidden to all elements outside
 * the modal. Once the modal is closed, aria-hidden is removed. But this will
 * cause the rbd announcer to be announced again. To avoid this, we remove the
 * content from the announcer to skip announcing it.
 */
export function useFixLiveRegionAfterModals() {
  useEffect(() => {
    // We assume that there is only one announcer element!
    const element = document.querySelector('#rbd-announcement-1[aria-live]');

    function handleMutation() {
      if (element && element.getAttribute('aria-hidden') === 'true') {
        element.textContent = '';
      }
    }

    const observer = new MutationObserver(handleMutation);

    if (element) {
      observer.observe(element, {
        attributes: true,
        attributeFilter: ['aria-hidden'],
      });

      handleMutation();
    }

    return () => {
      observer.disconnect();
    };
  });
}
