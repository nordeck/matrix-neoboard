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
import noop from 'lodash/noop';
import { ReactNode, Ref, useEffect, useRef, useState } from 'react';

export type ToolsBarSecondaryMenuProps = {
  /**
   * The toolbar item to render, e.g. a ToolbarRadio. It is wrapped in a
   * plain element used to anchor the secondary menu, so the item itself
   * doesn't need to support refs.
   */
  item: ReactNode;

  /** If undefined, no menu holder (Popper) is rendered. */
  secondaryMenu?: ReactNode;
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
 * secondary menu centered above it.
 */
export function ToolsBarSecondaryMenu({
  item,
  secondaryMenu,
}: ToolsBarSecondaryMenuProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const popperInstanceRef = useRef<PopperInstance | null>(null);
  const [menuContentEl, setMenuContentEl] = useState<HTMLDivElement | null>(
    null,
  );

  // Registers an observer for the event when the secondaryMenu grows or shrinks.
  // This will tell Popper to recalculate the position.
  useEffect(() => {
    if (!menuContentEl) {
      return;
    }

    // noop if not in a browser env, useMeasure does something similar
    const observer = window?.ResizeObserver
      ? new ResizeObserver(() => {
          popperInstanceRef.current?.update();
        })
      : {
          observe: noop,
          disconnect: noop,
        };

    observer.observe(menuContentEl);
    return () => observer.disconnect();
  }, [menuContentEl]);

  return (
    <>
      {/* Flex/grid containers "blockify" span children, so it sizes to fit the item without affecting layout. */}
      <span ref={setAnchorEl}>{item}</span>
      {secondaryMenu && (
        <Popper
          data-testid="tools-bar-secondary-menu-popper"
          open={true}
          anchorEl={anchorEl}
          placement="top"
          modifiers={popperModifiers}
          popperRef={popperInstanceRef}
          sx={{
            zIndex: (theme) => theme.zIndex.appBar,
            pointerEvents: 'initial',
          }}
        >
          <div ref={setMenuContentEl}>{secondaryMenu}</div>
        </Popper>
      )}
    </>
  );
}
