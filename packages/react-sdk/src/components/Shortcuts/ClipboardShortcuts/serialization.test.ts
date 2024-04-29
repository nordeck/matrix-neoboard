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

import {
  mockEllipseElement,
  mockLineElement,
} from '../../../lib/testUtils/documentTestUtils';
import {
  ClipboardContent,
  deserializeFromClipboard,
  deserializeFromHtml,
  deserializeFromPlainText,
  escapeTextAsHtml,
  serializeAsHtml,
  serializeAsPlainText,
  serializeToClipboard,
} from './serialization';

describe('serializeToClipboard', () => {
  it('should serialize plain text and HTML', () => {
    const clipboardContent = serializeToClipboard({
      elements: [mockEllipseElement({ text: 'Hello World' })],
    });

    expect(clipboardContent).toEqual({
      'text/html':
        '<span data-meta="<--(net.nordeck.whiteboard)eyJlbGVtZW50cyI6W3sidHlwZSI6InNoYXBlIiwia2luZCI6ImVsbGlwc2UiLCJwb3NpdGlvbiI6eyJ4IjowLCJ5IjoxfSwiZmlsbENvbG9yIjoiI2ZmZmZmZiIsImhlaWdodCI6MTAwLCJ3aWR0aCI6NTAsInRleHQiOiJIZWxsbyBXb3JsZCJ9XX0=(/net.nordeck.whiteboard)-->"></span><div>Hello World</div>',
      'text/plain': 'Hello World',
    });
  });
});

describe('deserializeFromClipboard', () => {
  it('should prefer deserializing from HTML', () => {
    const content = deserializeFromClipboard({
      'text/html':
        '<span data-meta="<--(net.nordeck.whiteboard)eyJlbGVtZW50cyI6W3sidHlwZSI6InNoYXBlIiwia2luZCI6ImVsbGlwc2UiLCJwb3NpdGlvbiI6eyJ4IjowLCJ5IjoxfSwiZmlsbENvbG9yIjoiI2ZmZmZmZiIsImhlaWdodCI6MTAwLCJ3aWR0aCI6NTAsInRleHQiOiJIZWxsbyBIVE1MIn1dfQ==(/net.nordeck.whiteboard)-->"></span><div>Hello HTML</div>',
      'text/plain': 'Hello Plain',
    });

    expect(content).toEqual({
      elements: [
        {
          fillColor: '#ffffff',
          height: 100,
          kind: 'ellipse',
          position: { x: 0, y: 1 },
          text: 'Hello HTML',
          type: 'shape',
          width: 50,
        },
      ],
    });
  });

  it('should fallback deserializing from plain text', () => {
    const content = deserializeFromClipboard({
      'text/html': '<div>Hello HTML</div>',
      'text/plain': 'Hello Plain',
    });

    expect(content).toEqual({
      elements: [
        {
          fillColor: '#FFFFFF',
          height: 300,
          kind: 'rectangle',
          position: { x: 660, y: 390 },
          text: 'Hello Plain',
          type: 'shape',
          width: 600,
        },
      ],
    });
  });

  it('should try deserializing plain text as HTML', () => {
    const content = deserializeFromClipboard({
      'text/plain':
        '<span data-meta="<--(net.nordeck.whiteboard)eyJlbGVtZW50cyI6W3sidHlwZSI6InNoYXBlIiwia2luZCI6ImVsbGlwc2UiLCJwb3NpdGlvbiI6eyJ4IjowLCJ5IjoxfSwiZmlsbENvbG9yIjoiI2ZmZmZmZiIsImhlaWdodCI6MTAwLCJ3aWR0aCI6NTAsInRleHQiOiJIZWxsbyBIVE1MIn1dfQ==(/net.nordeck.whiteboard)-->"></span><div>Hello Html</div>',
    });

    expect(content).toEqual({
      elements: [
        {
          fillColor: '#ffffff',
          height: 100,
          kind: 'ellipse',
          position: { x: 0, y: 1 },
          text: 'Hello HTML',
          type: 'shape',
          width: 50,
        },
      ],
    });
  });

  it('should ignore other clipboard data types', () => {
    const content = deserializeFromClipboard({
      'image/png': 'PNG…',
    } as ClipboardContent);

    expect(content).toEqual({});
  });
});

describe('serializeAsPlainText', () => {
  it('should serialize text of elements', () => {
    expect(
      serializeAsPlainText({
        elements: [mockEllipseElement({ text: 'Hello World' })],
      }),
    ).toBe('Hello World');
  });

  it('should serialize text of multiple elements', () => {
    expect(
      serializeAsPlainText({
        elements: [
          mockEllipseElement({ text: 'Hello World' }),
          mockEllipseElement({ text: 'With\nLine\nBreaks' }),
        ],
      }),
    ).toBe('Hello World With\nLine\nBreaks');
  });

  it('should serialize empty text of elements without text', () => {
    expect(
      serializeAsPlainText({
        elements: [mockLineElement()],
      }),
    ).toBe('');
  });
});

describe('deserializeFromPlainText', () => {
  it('should create a new element from plain text', () => {
    const content = deserializeFromPlainText('Hello World');

    expect(content).toEqual({
      elements: [
        {
          fillColor: '#FFFFFF',
          height: 300,
          kind: 'rectangle',
          position: { x: 660, y: 390 },
          text: 'Hello World',
          type: 'shape',
          width: 600,
        },
      ],
    });
  });
});

describe('serializeAsHtml', () => {
  it('should serialize elements as HTML', () => {
    const content = serializeAsHtml({
      elements: [mockEllipseElement({ text: 'Hello World' })],
    });

    expect(content).toBe(
      '<span data-meta="<--(net.nordeck.whiteboard)eyJlbGVtZW50cyI6W3sidHlwZSI6InNoYXBlIiwia2luZCI6ImVsbGlwc2UiLCJwb3NpdGlvbiI6eyJ4IjowLCJ5IjoxfSwiZmlsbENvbG9yIjoiI2ZmZmZmZiIsImhlaWdodCI6MTAwLCJ3aWR0aCI6NTAsInRleHQiOiJIZWxsbyBXb3JsZCJ9XX0=(/net.nordeck.whiteboard)-->"></span><div>Hello World</div>',
    );
  });

  it('should serialize multiple elements as HTML', () => {
    const content = serializeAsHtml({
      elements: [
        mockEllipseElement({ text: 'Hello World' }),
        mockEllipseElement({ text: 'Multi\nLine' }),
        mockLineElement(),
      ],
    });

    expect(content).toBe(
      '<span data-meta="<--(net.nordeck.whiteboard)eyJlbGVtZW50cyI6W3sidHlwZSI6InNoYXBlIiwia2luZCI6ImVsbGlwc2UiLCJwb3NpdGlvbiI6eyJ4IjowLCJ5IjoxfSwiZmlsbENvbG9yIjoiI2ZmZmZmZiIsImhlaWdodCI6MTAwLCJ3aWR0aCI6NTAsInRleHQiOiJIZWxsbyBXb3JsZCJ9LHsidHlwZSI6InNoYXBlIiwia2luZCI6ImVsbGlwc2UiLCJwb3NpdGlvbiI6eyJ4IjowLCJ5IjoxfSwiZmlsbENvbG9yIjoiI2ZmZmZmZiIsImhlaWdodCI6MTAwLCJ3aWR0aCI6NTAsInRleHQiOiJNdWx0aVxuTGluZSJ9LHsidHlwZSI6InBhdGgiLCJraW5kIjoibGluZSIsInBvc2l0aW9uIjp7IngiOjAsInkiOjF9LCJzdHJva2VDb2xvciI6IiNmZmZmZmYiLCJwb2ludHMiOlt7IngiOjAsInkiOjF9LHsieCI6MiwieSI6M31dfV19(/net.nordeck.whiteboard)-->"></span><div>Hello World</div><div>Multi<br>Line</div>',
    );
  });
});

describe('deserializeFromHtml', () => {
  it('should deserialize elements from HTML', () => {
    const content = deserializeFromHtml(
      '<span data-meta="<--(net.nordeck.whiteboard)eyJlbGVtZW50cyI6W3sidHlwZSI6InNoYXBlIiwia2luZCI6ImVsbGlwc2UiLCJwb3NpdGlvbiI6eyJ4IjowLCJ5IjoxfSwiZmlsbENvbG9yIjoiI2ZmZmZmZiIsImhlaWdodCI6MTAwLCJ3aWR0aCI6NTAsInRleHQiOiJIZWxsbyBXb3JsZCJ9XX0=(/net.nordeck.whiteboard)-->"></span><div>Hello World</div>',
    );

    expect(content).toEqual({
      elements: [
        {
          fillColor: '#ffffff',
          height: 100,
          kind: 'ellipse',
          position: { x: 0, y: 1 },
          text: 'Hello World',
          type: 'shape',
          width: 50,
        },
      ],
    });
  });

  it('should ignore invalid elements', () => {
    const content = deserializeFromHtml(
      '<span data-meta="<--(net.nordeck.whiteboard)eyJlbGVtZW50cyI6W3sidHlwZSI6InNoYXBlIiwia2luZCI6Im32Yml1c3N0cmlwIiwicG9zaXRpb24iOnsieCI6MCwieSI6MX0sImZpbGxDb2xvciI6IiNmZmZmZmYiLCJoZWlnaHQiOjEwMCwid2lkdGgiOjUwLCJ0ZXh0IjoiSGVsbG8gV29ybGQifV19(/net.nordeck.whiteboard)-->"></span><div>Hello World</div>',
    );

    expect(content).toEqual({ elements: [] });
  });

  it('should ignore invalid JSON', () => {
    const content = deserializeFromHtml(
      '<span data-meta="<--(net.nordeck.whiteboard)eyJl(/net.nordeck.whiteboard)-->"></span><div>Hello World</div>',
    );

    expect(content).toEqual({});
  });

  it('should ignore missing start marker', () => {
    const content = deserializeFromHtml('<div>Hello World</div>');

    expect(content).toEqual({});
  });

  it('should ignore missing end marker', () => {
    const content = deserializeFromHtml(
      '<span data-meta="<--(net.nordeck.whiteboard)eyJlbGVtZW50cyI6W3sidHlwZSI6InNoYXBlIiwia2luZCI6Im32Yml1c3N0cmlwIiwicG9zaXRpb24iOnsieCI6MCwieSI6MX0sImZpbGxDb2xvciI6IiNmZmZmZmYiLCJoZWlnaHQiOjEwMCwid2lkdGgiOjUwLCJ0ZXh0IjoiSGVsbG8gV29ybGQifV19"></span><div>Hello World</div>',
    );

    expect(content).toEqual({});
  });
});

describe('escapeTextAsHtml', () => {
  it('should convert a single line string and escape HTML', () => {
    expect(escapeTextAsHtml('Hello <b>World</b>')).toEqual(
      'Hello &lt;b&gt;World&lt;/b&gt;',
    );
  });

  it('should convert a multiline line string and escape HTML', () => {
    expect(escapeTextAsHtml('Hello\n\nWorld\n2 > 1')).toEqual(
      'Hello<br><br>World<br>2 &gt; 1',
    );
  });
});
