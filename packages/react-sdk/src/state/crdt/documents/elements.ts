/*
 * Copyright 2022 Nordeck IT + Consulting GmbH
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

import Joi from 'joi';
import loglevel from 'loglevel';
// Do not import from the index file to prevent cyclic dependencies
import { clamp } from 'lodash';
import { defaultAcceptedImageTypes } from '../../../components/ImageUpload/consts';
import { Elements } from '../../types';
import {
  BoundingRect,
  calculateBoundingRectForPoints,
  isPointWithinBoundingRect,
  Point,
  pointSchema,
} from './point';

export const disallowElementIds = ['__proto__', 'constructor'];

export type ElementBase = {
  type: string;
  position: Point;
};

const elementBaseSchema = Joi.object<ElementBase, true>({
  type: Joi.string().required(),
  position: pointSchema.required(),
})
  .unknown()
  .required();

export type ShapeKind = 'rectangle' | 'circle' | 'ellipse' | 'triangle';
export type TextAlignment = 'left' | 'center' | 'right';
export type TextFontFamily =
  | 'Abel'
  | 'Actor'
  | 'Adamina'
  | 'Chewy'
  | 'Gwendolyn'
  | 'Inter'
  | 'Pirata One';

export type ShapeElement = ElementBase & {
  type: 'shape';
  kind: ShapeKind;
  width: number;
  height: number;
  fillColor: string;
  strokeColor?: string;
  strokeWidth?: number;
  borderRadius?: number;
  text: string;
  textAlignment?: TextAlignment;
  textColor?: string;
  textBold?: boolean;
  textItalic?: boolean;
  stickyNote?: boolean;
  textSize?: number;
  textFontFamily: TextFontFamily;
  connectedPaths?: string[];
  attachedFrame?: string;
};

const emptyCoordinateSchema = Joi.any().valid(null, 0, '');

export const shapeElementSchema = elementBaseSchema
  .append<ShapeElement>({
    type: Joi.string().valid('shape').required(),
    kind: Joi.string()
      .valid('rectangle', 'circle', 'ellipse', 'triangle')
      .required(),
    width: Joi.number().strict().empty(emptyCoordinateSchema).default(1),
    height: Joi.number().strict().empty(emptyCoordinateSchema).default(1),
    fillColor: Joi.string().required(),
    strokeColor: Joi.string().strict(),
    strokeWidth: Joi.number().strict(),
    borderRadius: Joi.number().strict(),
    text: Joi.string().min(0).required(),
    textAlignment: Joi.string().valid('left', 'center', 'right'),
    textColor: Joi.string().strict(),
    textBold: Joi.boolean(),
    textItalic: Joi.boolean(),
    stickyNote: Joi.boolean(),
    textSize: Joi.number().strict(),
    textFontFamily: Joi.string().strict().default('Inter'),
    connectedPaths: Joi.array().items(Joi.string().not(...disallowElementIds)),
    attachedFrame: Joi.string().not(...disallowElementIds),
  })
  .required();

export type PathKind = 'line' | 'polyline';

export type LineMarker = 'arrow-head-line';

export type PathElement = ElementBase & {
  type: 'path';
  kind: PathKind;
  points: Point[];
  strokeColor: string;
  startMarker?: LineMarker;
  endMarker?: LineMarker;
  connectedElementStart?: string;
  connectedElementEnd?: string;
  attachedFrame?: string;
};

export const pathElementSchema = elementBaseSchema
  .append<PathElement>({
    type: Joi.string().valid('path').required(),
    kind: Joi.string().valid('line', 'polyline').required(),
    points: Joi.array().items(pointSchema).required(),
    strokeColor: Joi.string().required(),
    startMarker: Joi.string().valid('arrow-head-line'),
    endMarker: Joi.string().valid('arrow-head-line'),
    connectedElementStart: Joi.string().not(...disallowElementIds),
    connectedElementEnd: Joi.string().not(...disallowElementIds),
    attachedFrame: Joi.string().not(...disallowElementIds),
  })
  .required();

export type FrameElement = ElementBase & {
  type: 'frame';
  width: number;
  height: number;
  attachedElements?: string[];
};

export const frameElementSchema = elementBaseSchema
  .append<FrameElement>({
    type: Joi.string().valid('frame').required(),
    width: Joi.number().strict().empty(emptyCoordinateSchema).default(1),
    height: Joi.number().strict().empty(emptyCoordinateSchema).default(1),
    attachedElements: Joi.array().items(
      Joi.string().not(...disallowElementIds),
    ),
  })
  .required();

export type ImageMimeType =
  | 'image/gif'
  | 'image/jpeg'
  | 'image/png'
  | 'image/svg+xml';

export type ImageElement = ElementBase & {
  type: 'image';
  width: number;
  height: number;
  /**
   * MXC URI of the image
   * {@link https://spec.matrix.org/v1.9/client-server-api/#matrix-content-mxc-uris}
   */
  mxc: string;
  fileName: string;
  /**
   * @deprecated  This is kept for backwards compatibility. We dont send it anymore. DO NOT USE!
   */
  mimeType?: ImageMimeType;
  attachedFrame?: string;
};

export const imageElementSchema = elementBaseSchema
  .append<ImageElement>({
    type: Joi.string().valid('image').required(),
    mxc: Joi.string()
      .regex(/mxc:\/\/.*\/.*/)
      .allow('')
      .required(),
    fileName: Joi.string().required(),
    // This is kept for backwards compatibility. We dont send it anymore
    mimeType: Joi.string()
      .valid(...Object.keys(defaultAcceptedImageTypes))
      .optional(),
    width: Joi.number().strict().empty(emptyCoordinateSchema).default(1),
    height: Joi.number().strict().empty(emptyCoordinateSchema).default(1),
    attachedFrame: Joi.string().not(...disallowElementIds),
  })
  .required();

export type Element = ShapeElement | PathElement | ImageElement | FrameElement;
export type ElementKind = ShapeKind | PathKind;

export const elementSchema = Joi.alternatives<Element>().conditional('.type', [
  { is: 'shape', then: shapeElementSchema },
  { is: 'frame', then: frameElementSchema },
  { is: 'path', then: pathElementSchema },
  { is: 'image', then: imageElementSchema },
]);

export function isValidElement(element: unknown): element is Element {
  const result = elementSchema.validate(element);

  if (result.error) {
    loglevel.error('Error while validating the element', result.error);
    return false;
  }

  return true;
}

export function calculateBoundingRectForElements(
  elements: Element[],
): BoundingRect {
  const element = elements.length === 1 ? elements[0] : undefined;

  const elementsBoundingRect =
    elements.length > 1
      ? calculateBoundingRectForPoints(
          elements.flatMap((e) =>
            e.type === 'path'
              ? e.points.map((p) => ({
                  x: e.position.x + p.x,
                  y: e.position.y + p.y,
                }))
              : [
                  { x: e.position.x, y: e.position.y },
                  { x: e.position.x + e.width, y: e.position.y + e.height },
                ],
          ),
        )
      : undefined;

  const x = element?.position.x ?? elementsBoundingRect?.offsetX ?? 0;
  const y = element?.position.y ?? elementsBoundingRect?.offsetY ?? 0;

  const height =
    element?.type === 'path'
      ? calculateBoundingRectForPoints(element.points).height
      : (element?.height ?? elementsBoundingRect?.height ?? 0);
  const width =
    element?.type === 'path'
      ? calculateBoundingRectForPoints(element.points).width
      : (element?.width ?? elementsBoundingRect?.width ?? 0);

  return { offsetX: x, offsetY: y, width, height };
}

export type Size = {
  width: number;
  height: number;
};

/**
 * Clamp element position to fit into the container
 * @param position element position
 * @param elementSize element size
 * @param containerSize container size
 */
export function clampElementPosition(
  position: Point,
  elementSize: Size,
  containerSize: Size,
): Point {
  return {
    x: clamp(position.x, 0, containerSize.width - elementSize.width - 1),
    y: clamp(position.y, 0, containerSize.height - elementSize.height - 1),
  };
}

/**
 * Calculate the size of an element so that it fits into a container.
 * Maintain the aspect ratio.
 *
 * @param elementSize - Element size
 * @param containerSize - Container size to fit the element into
 * @returns Fitted element size
 */
export function calculateFittedElementSize(
  elementSize: Size,
  containerSize: Size,
): Size {
  const resultSize = { ...elementSize };

  if (elementSize.width > containerSize.width) {
    const scaleFactor = containerSize.width / elementSize.width;
    resultSize.width = containerSize.width;
    resultSize.height = Math.round(elementSize.height * scaleFactor);
  }

  if (elementSize.height > containerSize.height) {
    const scaleFactor = containerSize.height / elementSize.height;
    resultSize.height = containerSize.height;
    resultSize.width = Math.round(elementSize.width * scaleFactor);
  }

  return resultSize;
}

/**
 * @returns true, if the element is a shape without a background color, else false
 */
export function isTextShape(element: Element): boolean {
  return (
    element.type === 'shape' &&
    // a text shape does not have a background color
    (element.fillColor === '' || element.fillColor === 'transparent') &&
    element.text.trim() !== ''
  );
}

/**
 * @returns true, if the element is a shape with a background color, else false
 */
export function isShapeWithText(element: Element): boolean {
  return (
    element.type === 'shape' &&
    element.fillColor !== '' &&
    element.fillColor !== 'transparent' &&
    element.text.trim() !== ''
  );
}

/**
 * @returns true if elements contain at least one shape without a background color an a text, else false
 */
export function includesTextShape(elements: Element[]): boolean {
  return elements.some(isTextShape);
}

/**
 * @returns true if elements contain at least one shape with a background color and a text, else false
 */
export function includesShapeWithText(elements: Element[]): boolean {
  return elements.some(isShapeWithText);
}

export function isShapeElementPair(
  pair: [string, Element],
): pair is [string, ShapeElement] {
  return pair[1].type === 'shape';
}

export function modifyElementPosition<T extends ElementBase>(
  element: T,
  positionClamp: Point,
  offsetX: number,
  offsetY: number,
): T {
  return {
    ...element,
    position: {
      x: positionClamp.x + (element.position.x - offsetX),
      y: positionClamp.y + (element.position.y - offsetY),
    },
  };
}

/**
 * Find a frame to attach and copy the passed element with the attached frame.
 * @param element
 * @param frameElements
 */
export function copyElementWithAttachedFrame<
  T extends ShapeElement | PathElement | ImageElement,
>(element: T, frameElements: Elements<FrameElement>): T {
  const frameElementId = findFrameToAttach(element, frameElements);

  let newElement = element;
  if (frameElementId) {
    newElement = {
      ...newElement,
      attachedFrame: frameElementId,
    };
  }

  return newElement;
}

/**
 * Find the topmost frame element that fully contains the passed element.
 * @param element element - element to check
 * @param frameElements - frame elements
 * @returns frame id
 */
export function findFrameToAttach(
  element: ShapeElement | PathElement | ImageElement,
  frameElements: Elements<FrameElement>,
): string | undefined {
  const { position } = element;
  const { width, height } =
    element.type === 'path'
      ? calculateBoundingRectForPoints(element.points)
      : element;

  const entry = Object.entries(frameElements)
    .reverse()
    .find(([_, frameElement]) => {
      const frameBoundingRect: BoundingRect = {
        offsetX: frameElement.position.x,
        offsetY: frameElement.position.y,
        width: frameElement.width,
        height: frameElement.height,
      };
      return (
        isPointWithinBoundingRect(position, frameBoundingRect) &&
        isPointWithinBoundingRect(
          {
            x: position.x + width,
            y: position.y + height,
          },
          frameBoundingRect,
        )
      );
    });

  if (entry) {
    const [frameElementId] = entry;
    return frameElementId;
  } else {
    return undefined;
  }
}

/**
 * Position elements to gird
 * @param elements elements
 * @param gridWidth grid width
 * @param gridHeight grid height
 */
function positionElementsToGrid<
  T extends ElementBase & {
    width: number;
    height: number;
  },
>(
  elements: T[],
  gridWidth: number,
  gridHeight: number,
): {
  elements: T[];
  rect: BoundingRect;
} {
  const margin = 20;
  const maxWidth = gridWidth - margin;
  const maxHeight = gridHeight - margin;

  let currentX = margin;
  let currentY = margin;
  let rowMaxHeight = 0;

  let rectWidth: number = 0;
  let rectHeight: number = 0;

  const newElements: T[] = [];

  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];

    // are we exceeding the whiteboard height?
    if (currentY + element.height > maxHeight) {
      break;
    }

    if (currentX + element.width > maxWidth) {
      currentX = margin;
      currentY += rowMaxHeight + margin;
      rowMaxHeight = 0;

      // Check again after moving to new row if we'd exceed vertical space
      if (currentY + element.height > maxHeight) {
        break;
      }
    }

    const newElement: T = {
      ...element,
      position: {
        x: currentX,
        y: currentY,
      },
    };
    rectWidth = Math.max(rectWidth, currentX + element.width - margin);
    rectHeight = Math.max(rectHeight, currentY + element.height - margin);

    newElements.push(newElement);

    currentX += element.width + margin;
    rowMaxHeight = Math.max(rowMaxHeight, element.height);
  }

  return {
    elements: newElements,
    rect: {
      offsetX: margin,
      offsetY: margin,
      width: rectWidth,
      height: rectHeight,
    },
  };
}

/**
 * Position elements to the whiteboard in a grid and centered.
 * @param elements elements
 * @param whiteboardWidth whiteboard width
 * @param whiteboardHeight whiteboard height
 * @param centerX the elements grid center x on whiteboard
 * @param centerY the elements grid center y on whiteboard
 */
export function positionElementsToWhiteboard<
  T extends ElementBase & {
    width: number;
    height: number;
  },
>(
  elements: T[],
  whiteboardWidth: number,
  whiteboardHeight: number,
  centerX: number,
  centerY: number,
): T[] {
  const {
    elements: positionedElements,
    rect: { offsetX, offsetY, width, height },
  } = positionElementsToGrid(elements, whiteboardWidth, whiteboardHeight);

  const position: Point = {
    x: centerX - width / 2,
    y: centerY - height / 2,
  };
  const positionClamp = clampElementPosition(
    position,
    { width, height },
    { width: whiteboardWidth, height: whiteboardHeight },
  );
  return positionedElements.map((element) =>
    modifyElementPosition(element, positionClamp, offsetX, offsetY),
  );
}
