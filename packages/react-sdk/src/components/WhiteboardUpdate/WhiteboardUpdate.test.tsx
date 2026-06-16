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

import { getEnvironment } from '@matrix-widget-toolkit/mui';
import { MockedWidgetApi, mockWidgetApi } from '@matrix-widget-toolkit/testing';
import { Button } from '@mui/material';
import {
  act,
  render,
  screen,
  waitFor,
  waitForElementToBeRemoved,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentType, PropsWithChildren } from 'react';
import { Subject } from 'rxjs';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  Mocked,
  vi,
} from 'vitest';
import {
  mockEllipseElement,
  mockRectangleElement,
  mockWhiteboardManager,
  WhiteboardTestingContextProvider,
} from '../../lib/testUtils';
import {
  createWhiteboardDocument,
  generateAddElement,
  getNormalizedElementIds,
  WhiteboardDocument,
  WhiteboardDocumentVersion,
  WhiteboardInstance,
  WhiteboardManager,
} from '../../state';
import { MismatchedSnapshot, SynchronizedDocument } from '../../state/types';
import { WhiteboardUpdate } from './WhiteboardUpdate';

vi.mock('@matrix-widget-toolkit/mui', async () => ({
  ...(await vi.importActual<typeof import('@matrix-widget-toolkit/mui')>(
    '@matrix-widget-toolkit/mui',
  )),
  getEnvironment: vi.fn(),
}));

let widgetApi: MockedWidgetApi;

afterEach(() => {
  widgetApi.stop();
});

beforeEach(() => {
  vi.mocked(getEnvironment).mockImplementation(
    (_, defaultValue) => defaultValue,
  );

  widgetApi = mockWidgetApi();

  // @ts-ignore forcefully set for tests
  widgetApi.widgetParameters.baseUrl = 'https://example.com';
});

// createWhiteboardDocument() always contains a slide with this id
const slide0 = 'IN4h74suMiIAK4AVMAdl_';

describe('<WhiteboardUpdate/>', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let whiteboardManager: Mocked<WhiteboardManager>;
  let activeWhiteboardInstance: WhiteboardInstance;
  let mismatchedSnapshotSubject: Subject<MismatchedSnapshot | undefined>;
  let synchronizedDocument: SynchronizedDocument<WhiteboardDocument>;

  beforeEach(() => {
    ({ whiteboardManager, mismatchedSnapshotSubject, synchronizedDocument } =
      mockWhiteboardManager({
        whiteboardDocumentVersion: WhiteboardDocumentVersion.v1,
        slides: [[slide0, []]],
      }));
    activeWhiteboardInstance = whiteboardManager.getActiveWhiteboardInstance()!;

    Wrapper = ({ children }) => {
      return (
        <WhiteboardTestingContextProvider
          whiteboardManager={whiteboardManager}
          widgetApi={widgetApi}
        >
          {children}
        </WhiteboardTestingContextProvider>
      );
    };
  });

  it('should render a dialog to update if a mismatched snapshot is received', async () => {
    const remoteDocument = createWhiteboardDocument(
      WhiteboardDocumentVersion.v0,
    );

    const element0 = mockRectangleElement();
    const [changeFn] = generateAddElement(slide0, element0);
    remoteDocument.performChange(changeFn);

    mismatchedSnapshotSubject.next({
      documentVersion: remoteDocument.getDocumentVersion(),
      data: remoteDocument.store(),
    });

    render(
      <WhiteboardUpdate dialogAdditionalButtons={<Button>Go Back</Button>} />,
      {
        wrapper: Wrapper,
      },
    );

    const dialog = screen.getByRole('dialog', {
      name: 'Slides are now Frames',
    });

    expect(dialog).toBeInTheDocument();

    expect(
      within(dialog).getByRole('button', { name: 'Go Back' }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: 'Download' }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: 'Continue' }),
    ).toBeDisabled();
  });

  it('should render a dialog to upgrade', async () => {
    ({ whiteboardManager, mismatchedSnapshotSubject } = mockWhiteboardManager({
      slideCount: 1,
      whiteboardDocumentVersion: WhiteboardDocumentVersion.v0,
    }));
    activeWhiteboardInstance = whiteboardManager.getActiveWhiteboardInstance()!;

    const remoteDocument = createWhiteboardDocument(
      WhiteboardDocumentVersion.v1,
    );

    mismatchedSnapshotSubject.next({
      documentVersion: remoteDocument.getDocumentVersion(),
      data: remoteDocument.store(),
    });

    render(
      <WhiteboardUpdate dialogAdditionalButtons={<Button>Go Back</Button>} />,
      {
        wrapper: Wrapper,
      },
    );

    const dialog = screen.getByRole('dialog', {
      name: 'Upgrade required',
    });

    expect(dialog).toBeInTheDocument();

    expect(
      within(dialog).getByRole('button', { name: 'Go Back' }),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByRole('button', { name: 'Download' }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).queryByRole('button', { name: 'Continue' }),
    ).not.toBeInTheDocument();
  });

  it('should not render a dialog to update', async () => {
    render(<WhiteboardUpdate />, {
      wrapper: Wrapper,
    });

    const dialog = screen.queryByRole('dialog', {
      name: 'Slides are now Frames',
    });

    expect(dialog).not.toBeInTheDocument();
  });

  it('should download snapshot exported data if a mismatched snapshot is received', async () => {
    const remoteDocument = createWhiteboardDocument(
      WhiteboardDocumentVersion.v0,
    );

    const ellipseElement = mockEllipseElement();
    const [addElement0] = generateAddElement(slide0, ellipseElement);
    remoteDocument.performChange(addElement0);

    mismatchedSnapshotSubject.next({
      documentVersion: remoteDocument.getDocumentVersion(),
      data: remoteDocument.store(),
    });

    const blobSpy = vi.spyOn(global, 'Blob').mockReturnValue({
      size: 0,
      type: '',
      arrayBuffer: vi.fn(),
      slice: vi.fn(),
      stream: vi.fn(),
      text: vi.fn(),
    } as unknown as Blob);

    render(<WhiteboardUpdate />, { wrapper: Wrapper });

    const dialog = screen.getByRole('dialog', {
      name: 'Slides are now Frames',
    });

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Download' }),
    );

    await waitFor(() => {
      expect(blobSpy).toHaveBeenCalledWith([
        JSON.stringify({
          version: 'net.nordeck.whiteboard@v1',
          whiteboard: {
            slides: [
              {
                elements: [mockEllipseElement()],
              },
            ],
          },
        }),
      ]);
    });
  });

  it('should update slides to frames if a mismatched snapshot is received and download is clicked', async () => {
    const remoteDocument = createWhiteboardDocument(
      WhiteboardDocumentVersion.v0,
    );

    const element0 = mockRectangleElement();
    const [changeFn] = generateAddElement(slide0, element0);
    remoteDocument.performChange(changeFn);

    mismatchedSnapshotSubject.next({
      documentVersion: remoteDocument.getDocumentVersion(),
      data: remoteDocument.store(),
    });

    render(<WhiteboardUpdate />, {
      wrapper: Wrapper,
    });

    const dialog = screen.getByRole('dialog', {
      name: 'Slides are now Frames',
    });

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Download' }),
    );

    const button = within(dialog).getByRole('button', { name: 'Continue' });
    await userEvent.click(button);

    expect(button).toBeDisabled();

    act(() => {
      mismatchedSnapshotSubject.next(undefined);
    });

    await waitForElementToBeRemoved(dialog);

    expect(activeWhiteboardInstance.getSlideIds().length).toBe(1);
    expect(
      activeWhiteboardInstance.getActiveSlide()?.getFrameElementIds().length,
    ).toBe(1);
    expect(
      activeWhiteboardInstance.getActiveSlide()?.getElementIds().length,
    ).toBe(2);
  });

  it('should update slides to frames silently if a mismatched snapshot with infinite canvas document is received', async () => {
    const remoteDocument = createWhiteboardDocument(
      WhiteboardDocumentVersion.v0,
    );

    const ellipseElement = mockEllipseElement({
      position: {
        x: 19200 / 2,
        y: 10800 / 2,
      },
    });
    const [addElement0] = generateAddElement(slide0, ellipseElement);
    remoteDocument.performChange(addElement0);

    mismatchedSnapshotSubject.next({
      documentVersion: remoteDocument.getDocumentVersion(),
      data: remoteDocument.store(),
    });

    render(<WhiteboardUpdate />, {
      wrapper: Wrapper,
    });

    const document = synchronizedDocument.getDocument();

    await waitFor(() => {
      const elementIds = getNormalizedElementIds(document.getData(), slide0);
      const [slideElement0] = elementIds;

      expect(document.getData().toJSON()).toEqual({
        slideIds: [slide0],
        slides: {
          [slide0]: {
            elements: {
              [slideElement0]: mockEllipseElement({
                position: {
                  x: 19200 / 2,
                  y: 10800 / 2,
                },
              }),
            },
            elementIds,
            frameElementIds: [],
          },
        },
      });
    });
  });

  it('should show error if cannot update slides to frames', async () => {
    const remoteDocument = createWhiteboardDocument(
      WhiteboardDocumentVersion.v0,
    );

    const element0 = mockRectangleElement();
    const [changeFn] = generateAddElement(slide0, element0);
    remoteDocument.performChange(changeFn);

    mismatchedSnapshotSubject.next({
      documentVersion: remoteDocument.getDocumentVersion(),
      data: remoteDocument.store(),
    });

    vi.spyOn(
      activeWhiteboardInstance,
      'mergeMismatchedSnapshot',
    ).mockImplementation(() => {
      throw new Error('Something broke');
    });

    render(<WhiteboardUpdate />, {
      wrapper: Wrapper,
    });

    const dialog = screen.getByRole('dialog', {
      name: 'Slides are now Frames',
    });

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Download' }),
    );

    const continueButton = within(dialog).getByRole('button', {
      name: 'Continue',
    });
    await userEvent.click(continueButton);

    expect(continueButton).toBeDisabled();

    const alert = await screen.findByRole('alert');
    expect(
      within(alert).getByText(
        'An issue occurred when moving Slides into Frames',
      ),
    ).toBeInTheDocument();
  });
});
