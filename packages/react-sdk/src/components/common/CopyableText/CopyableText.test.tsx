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
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { CopyableText } from './CopyableText';

describe('<CopyableText/>', () => {
  it('should render without exploding', () => {
    render(<CopyableText label="Example" text="Hello World" />);

    const input = screen.getByRole('textbox', { name: /example/i });
    expect(input).toHaveValue('Hello World');
    expect(input).toHaveAttribute('readonly');

    expect(
      screen.getByRole('button', { name: /copy to clipboard/i }),
    ).toBeInTheDocument();
  });

  it('should copy text to clipboard', async () => {
    render(<CopyableText label="Example" text="Hello World" />);

    const copyButton = screen.getByRole('button', {
      name: /copy to clipboard/i,
    });
    expect(screen.getByTestId('ContentCopyOutlinedIcon')).toBeInTheDocument();

    await userEvent.click(copyButton);

    expect(navigator.clipboard.writeText).toBeCalledWith('Hello World');
    expect(screen.getByTestId('CheckOutlinedIcon')).toBeInTheDocument();

    await userEvent.tab();
    expect(screen.getByTestId('ContentCopyOutlinedIcon')).toBeInTheDocument();
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(
      <CopyableText label="Example" text="Hello World" />,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
