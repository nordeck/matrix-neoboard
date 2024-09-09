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

import { render, screen } from '@testing-library/react';
import { ComponentType, PropsWithChildren } from 'react';
import { useHotkeysContext } from 'react-hotkeys-hook';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  HOTKEY_SCOPE_GLOBAL,
  HOTKEY_SCOPE_WHITEBOARD,
  WhiteboardHotkeysProvider,
} from './WhiteboardHotkeysProvider';
import { usePauseHotkeysScope } from './usePauseHotkeysScope';

function EnabledScopes() {
  const { enabledScopes } = useHotkeysContext();
  return <div data-testid="enabled-scopes">{enabledScopes.join(',')}</div>;
}

function PauseScope({ scope, pause }: { scope: string; pause?: boolean }) {
  usePauseHotkeysScope(scope, pause);
  return null;
}

describe('usePauseHotkeysScope', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;

  beforeEach(() => {
    Wrapper = ({ children }) => {
      return (
        <WhiteboardHotkeysProvider>
          {children}
          <EnabledScopes />
        </WhiteboardHotkeysProvider>
      );
    };
  });

  it('should pause hotkeys scope by default', () => {
    render(<PauseScope scope={HOTKEY_SCOPE_WHITEBOARD} />, {
      wrapper: Wrapper,
    });
    expect(screen.getByTestId('enabled-scopes').textContent).toEqual(
      HOTKEY_SCOPE_GLOBAL,
    );
  });

  it('should pause hotkeys scope and unpause on unmount', () => {
    const { rerender } = render(
      <PauseScope scope={HOTKEY_SCOPE_WHITEBOARD} pause />,
      { wrapper: Wrapper },
    );
    expect(screen.getByTestId('enabled-scopes').textContent).toEqual(
      HOTKEY_SCOPE_GLOBAL,
    );

    rerender(<></>);
    expect(screen.getByTestId('enabled-scopes').textContent).toEqual(
      `${HOTKEY_SCOPE_GLOBAL},${HOTKEY_SCOPE_WHITEBOARD}`,
    );
  });

  it('should unpause hotkey', () => {
    const { rerender } = render(
      <PauseScope scope={HOTKEY_SCOPE_WHITEBOARD} pause />,
      { wrapper: Wrapper },
    );
    expect(screen.getByTestId('enabled-scopes').textContent).toEqual(
      HOTKEY_SCOPE_GLOBAL,
    );

    rerender(<PauseScope scope={HOTKEY_SCOPE_WHITEBOARD} pause={false} />);
    expect(screen.getByTestId('enabled-scopes').textContent).toEqual(
      `${HOTKEY_SCOPE_GLOBAL},${HOTKEY_SCOPE_WHITEBOARD}`,
    );
  });

  it('should only unpause if all pauses got released', () => {
    const { rerender } = render(
      <>
        <PauseScope scope={HOTKEY_SCOPE_WHITEBOARD} pause />
        <PauseScope scope={HOTKEY_SCOPE_WHITEBOARD} pause />
      </>,
      { wrapper: Wrapper },
    );
    expect(screen.getByTestId('enabled-scopes').textContent).toEqual(
      HOTKEY_SCOPE_GLOBAL,
    );

    rerender(
      <>
        <PauseScope scope={HOTKEY_SCOPE_WHITEBOARD} pause />
        <PauseScope scope={HOTKEY_SCOPE_WHITEBOARD} pause={false} />
      </>,
    );
    expect(screen.getByTestId('enabled-scopes').textContent).toEqual(
      HOTKEY_SCOPE_GLOBAL,
    );

    rerender(
      <>
        <PauseScope scope={HOTKEY_SCOPE_WHITEBOARD} pause={false} />
        <PauseScope scope={HOTKEY_SCOPE_WHITEBOARD} pause={false} />
      </>,
    );
    expect(screen.getByTestId('enabled-scopes').textContent).toEqual(
      `${HOTKEY_SCOPE_GLOBAL},${HOTKEY_SCOPE_WHITEBOARD}`,
    );
  });
});
