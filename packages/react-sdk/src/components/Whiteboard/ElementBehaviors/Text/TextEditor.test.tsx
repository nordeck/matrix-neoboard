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

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PropsWithChildren } from 'react';
import { useHotkeysContext } from 'react-hotkeys-hook';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TextAlignment } from '../../../../state';
import {
  HOTKEY_SCOPE_GLOBAL,
  HOTKEY_SCOPE_WHITEBOARD,
  WhiteboardHotkeysProvider,
} from '../../../WhiteboardHotkeysProvider';
import { TextEditor } from './TextEditor';

const defaultProps = {
  content: 'Hello',
  contentAlignment: 'center' as TextAlignment,
  contentBold: false,
  contentItalic: false,
  color: '#000000',
  onChange: vi.fn(),
  onBlur: vi.fn(),
  width: 200,
  height: 100,
  editModeOnMount: false,
  setTextToolsEnabled: vi.fn(),
};

function Wrapper({ children }: PropsWithChildren) {
  return <WhiteboardHotkeysProvider>{children}</WhiteboardHotkeysProvider>;
}

function EnabledScopes() {
  const { activeScopes } = useHotkeysContext();
  return <div data-testid="active-scopes">{activeScopes.join(',')}</div>;
}

describe('<TextEditor />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Escape hotkey', () => {
    it('should call onBlur and disable text tools when Escape is pressed in edit mode', async () => {
      const onBlur = vi.fn();
      render(
        <TextEditor
          {...defaultProps}
          editable
          editModeOnMount
          onBlur={onBlur}
        />,
        { wrapper: Wrapper },
      );

      await userEvent.keyboard('{Escape}');

      expect(onBlur).toHaveBeenCalledOnce();
      expect(defaultProps.setTextToolsEnabled).toHaveBeenCalledWith(false);
    });

    it('should not call onBlur when Escape is pressed while not in edit mode', async () => {
      const onBlur = vi.fn();
      render(
        <TextEditor {...defaultProps} editable={false} onBlur={onBlur} />,
        { wrapper: Wrapper },
      );

      await userEvent.keyboard('{Escape}');

      expect(onBlur).not.toHaveBeenCalled();
    });

    it('should exit edit mode via GLOBAL scope even when whiteboard scope is paused', async () => {
      // When editable + isEditMode, usePauseHotkeysScope disables the WHITEBOARD scope.
      // Escape is registered on HOTKEY_SCOPE_GLOBAL so it must fire regardless.
      const onBlur = vi.fn();
      render(
        <>
          <TextEditor
            {...defaultProps}
            editable
            editModeOnMount
            onBlur={onBlur}
          />
          <EnabledScopes />
        </>,
        { wrapper: Wrapper },
      );

      const activeScopes =
        screen.getByTestId('active-scopes').textContent?.split(',') ?? [];
      expect(activeScopes).toContain(HOTKEY_SCOPE_GLOBAL);
      expect(activeScopes).not.toContain(HOTKEY_SCOPE_WHITEBOARD);

      await userEvent.keyboard('{Escape}');

      expect(onBlur).toHaveBeenCalledOnce();
    });
  });
});
