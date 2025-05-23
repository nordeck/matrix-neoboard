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

export * from './crdt';
export * from './export';
export type {
  Elements,
  PresentationManager,
  PresentationState,
  WhiteboardInstance,
  WhiteboardManager,
  WhiteboardSlideInstance,
  WhiteboardStatistics,
} from './types';
export { useActiveCursors } from './useActiveCursors';
export {
  useActiveSlide,
  useActiveWhiteboardInstance,
  useActiveWhiteboardInstanceSlideIds,
  useActiveWhiteboardInstanceStatistics,
  useIsWhiteboardLoading,
  useUndoRedoState,
} from './useActiveWhiteboardInstance';
export { useActiveWhiteboardMembers } from './useActiveWhiteboardMembers';
export type { ActiveWhiteboardMember } from './useActiveWhiteboardMembers';
export { useOwnedWhiteboard } from './useOwnedWhiteboard';
export { usePresentationMode } from './usePresentationMode';
export {
  WhiteboardManagerProvider,
  useWhiteboardManager,
} from './useWhiteboardManager';
export {
  SlideProvider,
  useActiveElement,
  useActiveElements,
  useElement,
  useElements,
  useSlideElementIds,
  useSlideIsLocked,
  useWhiteboardSlideInstance,
} from './useWhiteboardSlideInstance';
export {
  disconnectPathElement,
  disconnectShapeElement,
  findConnectingPaths,
} from './utils';
export { createWhiteboardManager } from './whiteboardManagerImpl';
