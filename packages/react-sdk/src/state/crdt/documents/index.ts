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

export {
  calculateBoundingRectForElements,
  calculateFittedElementSize,
  clampElementPosition,
  copyElementWithAttachedFrame,
  disallowElementIds,
  findFrameToAttach,
  frameElementSchema,
  imageElementSchema,
  includesShapeWithText,
  includesTextShape,
  isShapeElementPair,
  isShapeWithText,
  isTextShape,
  isValidElement,
  modifyElementPosition,
  pathElementSchema,
  shapeElementSchema,
} from './elements';
export type {
  Element,
  ElementBase,
  ElementKind,
  FrameElement,
  ImageElement,
  ImageMimeType,
  PathElement,
  PathKind,
  ShapeElement,
  ShapeKind,
  Size,
  TextAlignment,
} from './elements';
export {
  generateAddElement,
  generateAddElements,
  generateAddSlide,
  generateDuplicateSlide,
  generateLockSlide,
  generateMoveDown,
  generateMoveElement,
  generateMoveElements,
  generateMoveSlide,
  generateMoveSlideFrame,
  generateMoveUp,
  generateRemoveElement,
  generateRemoveSlide,
  generateUnlockSlide,
  generateUpdateElement,
  getElement,
  getNormalizedElementIds,
  getNormalizedFrameElementIds,
  getNormalizedSlideIds,
  getSlide,
  getSlideLock,
} from './operations';
export type { UpdateElementPatch } from './operations';
export {
  calculateBoundingRectForPoints,
  isPointWithinBoundingRect,
  pointSchema,
} from './point';
export type { BoundingRect, Point } from './point';
export {
  createWhiteboardDocument,
  isValidWhiteboardDocument,
  isValidWhiteboardDocumentSnapshot,
} from './whiteboardDocument';
export type {
  Slide,
  SlideLock,
  WhiteboardDocument,
} from './whiteboardDocument';
