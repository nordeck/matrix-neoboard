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

import { TabsListProviderValue } from '@mui/base';
import { isEqual } from 'lodash';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useActiveWhiteboardInstanceSlideIds } from '../../state';

type RegisterItem = TabsListProviderValue['registerItem'];
type UnregisterItem = ReturnType<
  TabsListProviderValue['registerItem']
>['deregister'];

/**
 * Synchronize the order of the tabs in the TabsListProviderValue context
 * with the order of the slides in the whiteboard.
 *
 * The slides can be reordered by drag-and-drop, but this will not be synced
 * with the internal tracking of the Tab-order in material-ui since version
 * 5.12.1 (https://github.com/mui/material-ui/pull/36400). This would lead
 * to a difference between the display order and the order of ArrowUp/Down.
 *
 * This hook patches the context value and will register all components in
 * the correct order, even if the components didn't rerender. This is mainly
 * a problem because the tabs receive a key="slideId" which is mandatory for
 * react-beautiful-dnd but leads to synchronization problems with the
 * arrow-order of the tabs when a new slide is added or a slide is moved.
 */
export function useUpdatedTabsListProviderValue(
  contextValue: TabsListProviderValue
): TabsListProviderValue {
  const registerItemsRef = useRef(
    new Map<
      string,
      { args: Parameters<RegisterItem>; deregister: UnregisterItem }
    >()
  );

  const { registerItem: registerItemContext } = contextValue;

  const registerItem = useCallback<RegisterItem>(
    (...args) => {
      const [id] = args;
      const slideId = typeof id === 'string' ? id : undefined;

      const unregister = registerItemContext(...args);

      // remember the args and the unregister function for this slide
      if (slideId) {
        registerItemsRef.current.set(slideId, {
          args,
          deregister: unregister.deregister,
        });
      }

      return {
        ...unregister,
        deregister: () => {
          // forget the entry if the slide is deregistered
          if (slideId) {
            registerItemsRef.current.delete(slideId);
          }

          return unregister.deregister();
        },
      };
    },
    [registerItemContext]
  );

  const slideIds = useActiveWhiteboardInstanceSlideIds();
  const currentSlideIds = useRef(slideIds);

  useEffect(() => {
    // run when the slideIds have changed
    if (!isEqual(slideIds, currentSlideIds.current)) {
      currentSlideIds.current = slideIds;

      const registerCopy = new Map(registerItemsRef.current);

      // deregister all tab items
      for (const { deregister } of registerItemsRef.current.values()) {
        deregister();
      }
      registerItemsRef.current.clear();

      // re-register all tab items in the correct order
      slideIds.forEach((slideId) => {
        if (registerCopy.has(slideId)) {
          registerItem(...registerCopy.get(slideId)!.args);
        }
      });
    }
  }, [registerItem, slideIds]);

  return useMemo(
    () => ({ ...contextValue, registerItem }),
    [contextValue, registerItem]
  );
}
