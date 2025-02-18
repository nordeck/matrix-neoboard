/*
 * Copyright 2025 Nordeck IT + Consulting GmbH
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

import { describe, expect, it } from 'vitest';

import { mockLineElement, mockRectangleElement } from '../lib/testUtils';
import {
  connectPathElement,
  connectShapeElement,
  deleteConnectionData,
  disconnectPathElement,
  disconnectPathElementOnPosition,
  disconnectShapeElement,
  findConnectingPaths,
  findConnectingShapes,
} from './utils';

describe('findConnectingShapes', () => {
  it('should find no connecting shapes from single shape', () => {
    expect(
      findConnectingShapes({
        'shape-id-0': mockRectangleElement(),
      }),
    ).toEqual([]);
  });

  it('should find no connecting shapes from single path', () => {
    expect(
      findConnectingShapes({
        'path-id-0': mockLineElement(),
      }),
    ).toEqual([]);
  });

  it('should find connecting shapes from single path with connection', () => {
    expect(
      findConnectingShapes({
        'path-id-0': mockLineElement({
          connectedElementStart: 'shape-id-0',
        }),
      }),
    ).toEqual(['shape-id-0']);
  });

  it('should find connecting shapes from multiple paths with connection', () => {
    expect(
      findConnectingShapes({
        'path-id-0': mockLineElement({
          connectedElementStart: 'shape-id-0',
        }),
        'path-id-1': mockLineElement({
          connectedElementStart: 'shape-id-1',
          connectedElementEnd: 'shape-id-2',
        }),
      }),
    ).toEqual(['shape-id-0', 'shape-id-1', 'shape-id-2']);
  });

  it('should find connecting shapes from multiple paths with connection pointing to same shape', () => {
    expect(
      findConnectingShapes({
        'path-id-0': mockLineElement({
          connectedElementStart: 'shape-id-0',
        }),
        'path-id-1': mockLineElement({
          connectedElementStart: 'shape-id-0',
          connectedElementEnd: 'shape-id-2',
        }),
      }),
    ).toEqual(['shape-id-0', 'shape-id-2']);
  });
});

describe('findConnectingPaths', () => {
  it('should find no connecting paths', () => {
    expect(
      findConnectingPaths({
        'shape-id-0': mockRectangleElement(),
      }),
    ).toEqual([]);
  });

  it('should find connecting paths from single shape', () => {
    expect(
      findConnectingPaths({
        'shape-id-0': mockRectangleElement({
          connectedPaths: ['path-id-0', 'path-id-1'],
        }),
      }),
    ).toEqual(['path-id-0', 'path-id-1']);
  });

  it('should find connecting paths from multiple shapes', () => {
    expect(
      findConnectingPaths({
        'shape-id-0': mockRectangleElement({
          connectedPaths: ['path-id-0', 'path-id-1'],
        }),
        'shape-id-1': mockRectangleElement({
          connectedPaths: ['path-id-2'],
        }),
      }),
    ).toEqual(['path-id-0', 'path-id-1', 'path-id-2']);
  });

  it('should find connecting paths from multiple shapes and path', () => {
    expect(
      findConnectingPaths({
        'shape-id-0': mockRectangleElement({
          connectedPaths: ['path-id-0', 'path-id-1'],
        }),
        'shape-id-1': mockRectangleElement({
          connectedPaths: ['path-id-2'],
        }),
        'path-id-3': mockLineElement(),
      }),
    ).toEqual(['path-id-0', 'path-id-1', 'path-id-2']);
  });

  it('should find connecting paths from multiple shapes and connecting path selected', () => {
    expect(
      findConnectingPaths({
        'shape-id-0': mockRectangleElement({
          connectedPaths: ['path-id-0', 'path-id-1'],
        }),
        'shape-id-1': mockRectangleElement({
          connectedPaths: ['path-id-2'],
        }),
        'path-id-0': mockLineElement({
          connectedElementStart: 'shape-id-0',
        }),
      }),
    ).toEqual(['path-id-1', 'path-id-2']);
  });

  it('should find connecting paths from multiple shapes and connecting path between selected shapes', () => {
    expect(
      findConnectingPaths({
        'shape-id-0': mockRectangleElement({
          connectedPaths: ['path-id-0', 'path-id-1'],
        }),
        'shape-id-1': mockRectangleElement({
          connectedPaths: ['path-id-0'],
        }),
      }),
    ).toEqual(['path-id-0', 'path-id-1']);
  });
});

describe('connectPathElement', () => {
  it('should connect path start', () => {
    const patch = connectPathElement(mockLineElement(), 'start', 'shape-id-0');
    expect(patch).toEqual({
      connectedElementStart: 'shape-id-0',
    });
  });

  it('should connect path end', () => {
    const patch = connectPathElement(mockLineElement(), 'end', 'shape-id-0');
    expect(patch).toEqual({
      connectedElementEnd: 'shape-id-0',
    });
  });

  it('should connect path start to another shape', () => {
    const patch = connectPathElement(
      mockLineElement({
        connectedElementStart: 'shape-id-0',
      }),
      'start',
      'shape-id-1',
    );
    expect(patch).toEqual({
      connectedElementStart: 'shape-id-1',
    });
  });

  it('should connect path end to another shape', () => {
    const patch = connectPathElement(
      mockLineElement({
        connectedElementEnd: 'shape-id-0',
      }),
      'end',
      'shape-id-1',
    );
    expect(patch).toEqual({
      connectedElementEnd: 'shape-id-1',
    });
  });

  it('should not connect path if connected to shape by this end already', () => {
    const patch = connectPathElement(
      mockLineElement({
        connectedElementStart: 'shape-id-0',
      }),
      'start',
      'shape-id-0',
    );
    expect(patch).toBeUndefined();
  });

  it('should connect path by end to shape if connected by start already', () => {
    const patch = connectPathElement(
      mockLineElement({
        connectedElementStart: 'shape-id-0',
      }),
      'end',
      'shape-id-1',
    );
    expect(patch).toEqual({
      connectedElementEnd: 'shape-id-1',
    });
  });
});

describe('connectShapeElement', () => {
  it('should connect shape', () => {
    const patch = connectShapeElement(mockRectangleElement(), 'path-id-0');
    expect(patch).toEqual({
      connectedPaths: ['path-id-0'],
    });
  });

  it('should connect shape if has connection already', () => {
    const patch = connectShapeElement(
      mockRectangleElement({
        connectedPaths: ['path-id-1'],
      }),
      'path-id-2',
    );
    expect(patch).toEqual({
      connectedPaths: ['path-id-1', 'path-id-2'],
    });
  });

  it('should handle connection to the same path again', () => {
    const patch = connectShapeElement(
      mockRectangleElement({
        connectedPaths: ['path-id-1'],
      }),
      'path-id-1',
    );
    expect(patch).toEqual({
      connectedPaths: ['path-id-1', 'path-id-1'],
    });
  });
});

describe('disconnectPathElementOnPosition', () => {
  it('should disconnect path start', () => {
    const patch = disconnectPathElementOnPosition(
      mockLineElement({
        connectedElementStart: 'element-id-0',
        connectedElementEnd: 'element-id-1',
      }),
      'start',
    );
    expect(patch).toStrictEqual({
      connectedElementStart: undefined,
    });
  });

  it('should disconnect path start if no connection on end', () => {
    const patch = disconnectPathElementOnPosition(
      mockLineElement({
        connectedElementStart: 'element-id-0',
      }),
      'start',
    );
    expect(patch).toStrictEqual({
      connectedElementStart: undefined,
    });
  });

  it('should disconnect path end', () => {
    const patch = disconnectPathElementOnPosition(
      mockLineElement({
        connectedElementStart: 'element-id-0',
        connectedElementEnd: 'element-id-1',
      }),
      'end',
    );
    expect(patch).toStrictEqual({
      connectedElementEnd: undefined,
    });
  });

  it('should disconnect path end if no connection on start', () => {
    const patch = disconnectPathElementOnPosition(
      mockLineElement({
        connectedElementEnd: 'element-id-1',
      }),
      'end',
    );
    expect(patch).toStrictEqual({
      connectedElementEnd: undefined,
    });
  });

  it('should not disconnect path start if no connection', () => {
    const patch = disconnectPathElementOnPosition(
      mockLineElement({
        connectedElementEnd: 'element-id-1',
      }),
      'start',
    );
    expect(patch).toEqual(undefined);
  });

  it('should not disconnect path end if not connection', () => {
    const patch = disconnectPathElementOnPosition(
      mockLineElement({
        connectedElementStart: 'element-id-0',
      }),
      'end',
    );
    expect(patch).toEqual(undefined);
  });
});

describe('disconnectPathElement', () => {
  it('should disconnect path start by element id', () => {
    const patch = disconnectPathElement(
      mockLineElement({
        connectedElementStart: 'element-id-0',
        connectedElementEnd: 'element-id-1',
      }),
      ['element-id-0'],
    );
    expect(patch).toStrictEqual({
      connectedElementStart: undefined,
    });
  });

  it('should disconnect path end by element id', () => {
    const patch = disconnectPathElement(
      mockLineElement({
        connectedElementStart: 'element-id-0',
        connectedElementEnd: 'element-id-1',
      }),
      ['element-id-1'],
    );
    expect(patch).toStrictEqual({
      connectedElementEnd: undefined,
    });
  });

  it('should disconnect all path elements by ids', () => {
    const patch = disconnectPathElement(
      mockLineElement({
        connectedElementStart: 'element-id-0',
        connectedElementEnd: 'element-id-1',
      }),
      ['element-id-0', 'element-id-1'],
    );
    expect(patch).toStrictEqual({
      connectedElementStart: undefined,
      connectedElementEnd: undefined,
    });
  });

  it('should disconnect all path elements passing undefined', () => {
    const patch = disconnectPathElement(
      mockLineElement({
        connectedElementStart: 'element-id-0',
        connectedElementEnd: 'element-id-1',
      }),
      undefined,
    );
    expect(patch).toStrictEqual({
      connectedElementStart: undefined,
      connectedElementEnd: undefined,
    });
  });

  it('should not disconnect if not connected to element', () => {
    const patch = disconnectPathElement(
      mockLineElement({
        connectedElementStart: 'element-id-0',
        connectedElementEnd: 'element-id-1',
      }),
      ['element-id-2'],
    );
    expect(patch).toEqual(undefined);
  });

  it('should not disconnect if not connected to element and no connections', () => {
    const patch = disconnectPathElement(mockLineElement(), ['element-id-2']);
    expect(patch).toEqual(undefined);
  });
});

describe('disconnectShapeElement', () => {
  it('should disconnect shape by element id', () => {
    const patch = disconnectShapeElement(
      mockRectangleElement({
        connectedPaths: ['element-id-0', 'element-id-1'],
      }),
      ['element-id-1'],
    );
    expect(patch).toEqual({
      connectedPaths: ['element-id-0'],
    });
  });

  it('should disconnect all shape elements by ids', () => {
    const patch = disconnectShapeElement(
      mockRectangleElement({
        connectedPaths: ['element-id-0', 'element-id-1'],
      }),
      ['element-id-0', 'element-id-1'],
    );
    expect(patch).toStrictEqual({
      connectedPaths: undefined,
    });
  });

  it('should disconnect all shape elements passing undefined', () => {
    const patch = disconnectShapeElement(
      mockRectangleElement({
        connectedPaths: ['element-id-0', 'element-id-1'],
      }),
      undefined,
    );
    expect(patch).toStrictEqual({
      connectedPaths: undefined,
    });
  });

  it('should not disconnect if not connected to element', () => {
    const patch = disconnectShapeElement(
      mockRectangleElement({
        connectedPaths: ['element-id-0', 'element-id-1'],
      }),
      ['element-id-2'],
    );
    expect(patch).toEqual(undefined);
  });

  it('should not disconnect if not connected to element and no connections', () => {
    const patch = disconnectShapeElement(mockRectangleElement(), [
      'element-id-2',
    ]);
    expect(patch).toEqual(undefined);
  });

  it('should disconnect element only once', () => {
    const patch = disconnectShapeElement(
      mockRectangleElement({
        connectedPaths: ['element-id-0', 'element-id-1', 'element-id-0'],
      }),
      ['element-id-0'],
    );
    expect(patch).toEqual({
      connectedPaths: ['element-id-1', 'element-id-0'],
    });
  });

  it('should force to disconnect all passed elements', () => {
    const patch = disconnectShapeElement(
      mockRectangleElement({
        connectedPaths: ['element-id-0', 'element-id-1', 'element-id-0'],
      }),
      ['element-id-0'],
      true,
    );
    expect(patch).toEqual({
      connectedPaths: ['element-id-1'],
    });
  });
});

describe('deleteConnectionData', () => {
  it('should delete connection data from shape', () => {
    expect(
      deleteConnectionData(
        mockRectangleElement({
          connectedPaths: ['element-id-0', 'element-id-1'],
        }),
      ),
    ).toEqual(mockRectangleElement());
  });

  it('should delete connection data from line', () => {
    expect(
      deleteConnectionData(
        mockLineElement({
          connectedElementStart: 'element-id-0',
          connectedElementEnd: 'element-id-1',
        }),
      ),
    ).toEqual(mockLineElement());
  });
});
