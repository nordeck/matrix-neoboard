/*
 * Copyright 2026 Nordeck IT + Consulting GmbH
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

import { Popper, PopperProps } from '@mui/material';
import { ReactNode, Ref, useEffect, useRef, useState } from 'react';

export type SecondaryToolbarWrapperProps = {
  /**
   * The toolbar item to render, e.g. a ToolbarRadio. It is wrapped in a
   * plain element used to anchor the secondary toolbar, so the item itself
   * doesn't need to support refs.
   */
  item: ReactNode;

  /**
   * Element the toolbar is rendered into. Place it right after the primary
   * toolbar in the DOM, so that the Tab order continues from the primary
   * toolbar into the secondary toolbar and then on to the rest of the page.
   */
  container?: HTMLElement | null;

  /** A secondary toolbar If undefined, no toolbar holder (Popper) is rendered. */
  secondaryToolbar?: ReactNode;
};

const popperModifiers: PopperProps['modifiers'] = [
  { name: 'offset', options: { offset: [0, 8] } },
  { name: 'preventOverflow', options: { padding: 8 } },
];

// The popper.js instance passed to a Popper's `popperRef`, inferred from
// MUI's own prop type so we don't need a direct dependency on @popperjs/core.
type PopperInstance =
  NonNullable<PopperProps['popperRef']> extends Ref<infer T> ? T : never;

/**
 * Wraps a single toolbar item and gives it the ability to hold a floating
 * secondary toolbar centered above it.
 */
export function SecondaryToolbarWrapper({
  item,
  secondaryToolbar,
  container,
}: SecondaryToolbarWrapperProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const popperInstanceRef = useRef<PopperInstance | null>(null);
  const [secondaryToolbarContentEl, setSecondaryToolbarContentEl] =
    useState<HTMLDivElement | null>(null);

  // Registers an observer for the event when the secondaryMenu grows or shrinks.
  // This will tell Popper to recalculate the position.
  useEffect(() => {
    if (!secondaryToolbarContentEl) {
      return;
    }

    const observer = new ResizeObserver(() => {
      popperInstanceRef.current?.update();
    });

    observer.observe(secondaryToolbarContentEl);
    return () => observer.disconnect();
  }, [secondaryToolbarContentEl]);

  return (
    <>
      {/* Flex/grid containers "blockify" span children, so it sizes to fit the item without affecting layout. */}
      <span ref={setAnchorEl}>{item}</span>

      {secondaryToolbar && (
        <Popper
          data-testid="tools-bar-secondary-toolbar-popper"
          open={Boolean(anchorEl)}
          //Popper defaults to role="tooltip", which would wrap the toolbar
          // in an extra unwanted tooltip node in the accessibility tree
          role="presentation"
          container={container}
          anchorEl={anchorEl}
          placement="top"
          modifiers={popperModifiers}
          popperRef={popperInstanceRef}
          sx={{
            zIndex: (theme) => theme.zIndex.appBar,
            pointerEvents: 'initial',
          }}
        >
          <div ref={setSecondaryToolbarContentEl}>{secondaryToolbar}</div>
        </Popper>
      )}
    </>
  );
}
