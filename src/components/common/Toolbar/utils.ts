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

// Based on https://github.com/mui/material-ui/blob/091dd2aa7f508018f5078d7fa97cfd7a7ef72d24/packages/mui-base/src/TabsListUnstyled/useTabsList.ts

export const nextItem = (
  list: Element | null,
  item: Element | null
): Element | null => {
  if (!list) {
    return null;
  }

  if (list === item) {
    return list.firstElementChild;
  }
  if (item && item.firstElementChild) {
    return item.firstElementChild;
  }
  if (item && item.nextElementSibling) {
    return item.nextElementSibling;
  }
  while (item && item.parentElement !== list) {
    item = item.parentElement;
    if (item && item.nextElementSibling) {
      return item.nextElementSibling;
    }
  }
  return list?.firstElementChild;
};

export const previousItem = (
  list: Element | null,
  item: Element | null
): Element | null => {
  function lastChild(element: Element | null): Element | null {
    while (element?.lastElementChild) {
      element = element.lastElementChild;
    }
    return element;
  }

  if (!list) {
    return null;
  }
  if (list === item) {
    return list.lastElementChild;
  }
  if (item && item.previousElementSibling) {
    return lastChild(item.previousElementSibling);
  }
  if (item && item.parentElement !== list) {
    return item.parentElement;
  }
  return lastChild(list.lastElementChild);
};

export const moveFocus = (
  list: Element | null,
  currentFocus: Element | null,
  traversalFunction: (
    list: Element | null,
    currentFocus: Element | null
  ) => Element | null
) => {
  let wrappedOnce = false;
  let nextFocus = traversalFunction(list, currentFocus);

  while (list && nextFocus) {
    // Prevent infinite loop.
    if (nextFocus === list.firstChild) {
      if (wrappedOnce) {
        return;
      }
      wrappedOnce = true;
    }

    // Same logic as useAutocomplete.js
    const nextFocusDisabled =
      (nextFocus as HTMLInputElement).disabled ||
      nextFocus.getAttribute('aria-disabled') === 'true';

    if (!nextFocus.hasAttribute('tabindex') || nextFocusDisabled) {
      // Move to the next element.
      nextFocus = traversalFunction(list, nextFocus);
    } else {
      (nextFocus as HTMLElement).focus();
      return;
    }
  }
};

export function findParentRadioGroup(
  current: Element,
  list: Element | null
): Element | null {
  const parent = current.parentElement;

  if (parent === null) {
    return null;
  }

  if (parent === list) {
    return list;
  }

  // fallback to 'getAttribute' because 'role' is not supported by jsdom
  // https://github.com/jsdom/jsdom/issues/3323
  const role = parent.role ?? parent.getAttribute('role');
  if (role === 'radiogroup') {
    return parent;
  }

  return findParentRadioGroup(parent, list);
}

export function isRadioInput(
  element: Element | null
): element is HTMLInputElement {
  return (
    element?.tagName === 'INPUT' &&
    'type' in element &&
    element.type === 'radio'
  );
}
