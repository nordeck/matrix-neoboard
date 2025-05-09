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

import { infiniteCanvasMode } from '../Whiteboard';
import { ClipboardShortcuts } from './ClipboardShortcuts';
import { DeleteShortcut } from './DeleteShortcut';
import { DuplicateShortcut } from './DuplicateShortcut';
import { PresentationShortcuts } from './PresentationShortcuts';
import { ReorderElementsShortcuts } from './ReorderElementShortcuts';
import { TextFormattingShortcuts } from './TextFormattingShortcuts';
import { UndoRedoShortcuts } from './UndoRedoShortcuts';
import { ZoomShortcuts } from './ZoomShortcuts';

export function Shortcuts() {
  // Place to register all global shortcuts that are related to a slide
  return (
    <>
      <ClipboardShortcuts />
      <UndoRedoShortcuts />
      <ReorderElementsShortcuts />
      <DeleteShortcut />
      <DuplicateShortcut />
      <PresentationShortcuts />
      <TextFormattingShortcuts />
      {infiniteCanvasMode && <ZoomShortcuts />}
    </>
  );
}
