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

import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { SensorAPI, SnapDragActions } from 'react-beautiful-dnd';

// This hook is based on useKeyboardSensor() from react-beautiful-dnd.
// The original code with all its dependencies is spread over multiple files,
// but for simplicity we merge them here.
// We need the original behavior, except that we want to use a different key to
// lift and drop an item. The space key is already in use for selecting slides,
// so we use the "m" (for move) key instead.
// We also migrated from keyCode to code to avoid the use of the deprecated API.

// Based on https://github.com/atlassian/react-beautiful-dnd/blob/468c710f7b440ba1556d4381fca24ae78eb5cd4e/src/view/event-bindings/event-types.js
export type EventOptions = {
  passive?: boolean;
  capture?: boolean;
  // sometimes an event might only event want to be bound once
  once?: boolean;
};

export type EventBinding = {
  eventName: string;
  // The original flow types use any here
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fn: (event: any) => void;
  options?: EventOptions;
};

// Based on https://github.com/atlassian/react-beautiful-dnd/blob/468c710f7b440ba1556d4381fca24ae78eb5cd4e/src/view/use-sensor-marshal/sensors/util/prevent-standard-key-events.js
type KeyMap = {
  [key: string]: true;
};

const preventedKeys: KeyMap = {
  // submission
  Enter: true,
  // tabbing
  Tab: true,
};

function preventStandardKeyEvents(event: KeyboardEvent) {
  if (preventedKeys[event.code]) {
    event.preventDefault();
  }
}

// Based on https://github.com/atlassian/react-beautiful-dnd/blob/468c710f7b440ba1556d4381fca24ae78eb5cd4e/src/view/event-bindings/bind-events.js
type UnbindFn = () => void;

function getOptions(
  shared?: EventOptions,
  fromBinding?: EventOptions
): EventOptions {
  return {
    ...shared,
    ...fromBinding,
  };
}

export function bindEvents(
  el: Window,
  bindings: EventBinding[],
  sharedOptions?: EventOptions
): () => void {
  const unbindings: UnbindFn[] = bindings.map(
    (binding: EventBinding): UnbindFn => {
      const options: Object = getOptions(sharedOptions, binding.options);

      el.addEventListener(binding.eventName, binding.fn, options);

      return function unbind() {
        el.removeEventListener(binding.eventName, binding.fn, options);
      };
    }
  );

  // Return a function to unbind events
  return function unbindAll() {
    unbindings.forEach((unbind: UnbindFn) => {
      unbind();
    });
  };
}

// Based https://github.com/atlassian/react-beautiful-dnd/blob/468c710f7b440ba1556d4381fca24ae78eb5cd4e/src/view/use-sensor-marshal/sensors/use-keyboard-sensor.js
function noop() {}

const scrollJumpKeys: KeyMap = {
  PageDown: true,
  PageUp: true,
  Home: true,
  End: true,
};

function getDraggingBindings(
  actions: SnapDragActions,
  stop: () => void
): EventBinding[] {
  function cancel() {
    stop();
    actions.cancel();
  }

  function drop() {
    stop();
    actions.drop();
  }

  return [
    {
      eventName: 'keydown',
      fn: (event: KeyboardEvent) => {
        if (event.code === 'Escape') {
          event.preventDefault();
          cancel();
          return;
        }

        // Dropping
        if (event.code === 'KeyM') {
          // need to stop parent Draggable's thinking this is a lift
          event.preventDefault();
          drop();
          return;
        }

        // Movement
        if (event.code === 'ArrowDown') {
          event.preventDefault();
          actions.moveDown();
          return;
        }

        if (event.code === 'ArrowUp') {
          event.preventDefault();
          actions.moveUp();
          return;
        }

        if (event.code === 'ArrowRight') {
          event.preventDefault();
          actions.moveRight();
          return;
        }

        if (event.code === 'ArrowLeft') {
          event.preventDefault();
          actions.moveLeft();
          return;
        }

        // preventing scroll jumping at this time
        if (scrollJumpKeys[event.code]) {
          event.preventDefault();
          return;
        }

        preventStandardKeyEvents(event);
      },
    },
    // any mouse actions kills a drag
    {
      eventName: 'mousedown',
      fn: cancel,
    },
    {
      eventName: 'mouseup',
      fn: cancel,
    },
    {
      eventName: 'click',
      fn: cancel,
    },
    {
      eventName: 'touchstart',
      fn: cancel,
    },
    // resizing the browser kills a drag
    {
      eventName: 'resize',
      fn: cancel,
    },
    // kill if the user is using the mouse wheel
    // We are not supporting wheel / trackpad scrolling with keyboard dragging
    {
      eventName: 'wheel',
      fn: cancel,
      // chrome says it is a violation for this to not be passive
      // it is fine for it to be passive as we just cancel as soon as we get
      // any event
      options: { passive: true },
    },
    // Cancel on page visibility change
    {
      eventName: 'visibilitychange',
      fn: cancel,
    },
  ];
}

export function useCustomKeyboardSensor(api: SensorAPI) {
  const unbindEventsRef = useRef<() => void>(noop);

  const startCaptureBinding: EventBinding = useMemo(
    () => ({
      eventName: 'keydown',
      fn: function onKeyDown(event: KeyboardEvent) {
        // Event already used
        if (event.defaultPrevented) {
          return;
        }

        // Need to start drag with a m press
        if (event.code !== 'KeyM') {
          return;
        }

        const draggableId = api.findClosestDraggableId(event);

        if (!draggableId) {
          return;
        }

        const preDrag = api.tryGetLock(
          draggableId,
          // abort function not defined yet
          // eslint-disable-next-line no-use-before-define
          stop,
          { sourceEvent: event }
        );

        // Cannot start capturing at this time
        if (!preDrag) {
          return;
        }

        // we are consuming the event
        event.preventDefault();

        // There is no pending period for a keyboard drag
        // We can lift immediately
        const actions: SnapDragActions = preDrag.snapLift();

        // unbind this listener
        unbindEventsRef.current();

        // setup our function to end everything
        function stop() {
          // unbind dragging bindings
          unbindEventsRef.current();
          // start listening for capture again
          // eslint-disable-next-line no-use-before-define
          listenForCapture();
        }

        // bind dragging listeners
        unbindEventsRef.current = bindEvents(
          window,
          getDraggingBindings(actions, stop),
          { capture: true, passive: false }
        );
      },
    }),
    // not including startPendingDrag as it is not defined initially
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [api]
  );

  const listenForCapture = useCallback(
    function tryStartCapture() {
      const options: EventOptions = {
        passive: false,
        capture: true,
      };

      unbindEventsRef.current = bindEvents(
        window,
        [startCaptureBinding],
        options
      );
    },
    [startCaptureBinding]
  );

  useLayoutEffect(
    function mount() {
      listenForCapture();

      // kill any pending window events when unmounting
      return function unmount() {
        unbindEventsRef.current();
      };
    },
    [listenForCapture]
  );
}
