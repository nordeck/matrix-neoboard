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

import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TextAlignment } from '../../../../state';
import { WhiteboardHotkeysProvider } from '../../../WhiteboardHotkeysProvider';
import { TextEditor, TextEditorProps } from './TextEditor';

function Wrapper({ children }: PropsWithChildren) {
  return <WhiteboardHotkeysProvider>{children}</WhiteboardHotkeysProvider>;
}

describe('<TextEditor />', () => {
  let defaultProps: TextEditorProps;

  beforeEach(() => {
    defaultProps = {
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
  });

  it('should call onBlur and disable text tools when Escape is pressed if editable and edit mode is true', async () => {
    render(<TextEditor {...defaultProps} editable editModeOnMount />, {
      wrapper: Wrapper,
    });

    await userEvent.keyboard('{Escape}');

    expect(defaultProps.onBlur).toHaveBeenCalledOnce();
    expect(defaultProps.setTextToolsEnabled).toHaveBeenCalledWith(false);
  });

  it('should not call onBlur and disable text tools when Escape is pressed if editable and edit mode is false', async () => {
    render(<TextEditor {...defaultProps} editable />, { wrapper: Wrapper });

    await userEvent.keyboard('{Escape}');

    expect(defaultProps.onBlur).not.toHaveBeenCalled();
    expect(defaultProps.setTextToolsEnabled).not.toHaveBeenCalled();
  });

  it('should not call onBlur when Escape is pressed if not editable', async () => {
    render(<TextEditor {...defaultProps} editable={false} />, {
      wrapper: Wrapper,
    });

    await userEvent.keyboard('{Escape}');

    expect(defaultProps.onBlur).not.toHaveBeenCalled();
    expect(defaultProps.setTextToolsEnabled).not.toHaveBeenCalled();
  });
});
