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

import { createContext, PropsWithChildren, useMemo, useState } from 'react';

export type ElementAttachFrameSetterContextType = {
  /**
   * Set the calculated element to frame attachment mapping when any element is moved.
   * @param elementAttachFrame
   */
  setElementAttachFrame: (elementAttachFrame: Record<string, string>) => void;

  /**
   * Set element IDs that are moved because they are attached to the frame.
   * @param attachedElementsMovedByFrame
   */
  setAttachedElementsMovedByFrame: (
    attachedElementsMovedByFrame: string[],
  ) => void;

  /**
   * Set connecting path elements IDs: path elements that are NOT selected but
   * at least on one end connected to the active or attached element that is moved.
   * @param connectingPathIds
   */
  setConnectingPathIds: (connectingPathIds: string[]) => void;
};

export const ElementAttachFrameSetterContext = createContext<
  ElementAttachFrameSetterContextType | undefined
>(undefined);

export type ElementAttachFrameGetterContextType = {
  /**
   * Contains the element-to-frame attachment mapping, which is calculated
   * when elements are moved. The key is an element ID, and the value is a frame ID.
   */
  elementAttachFrame: Record<string, string>;

  /**
   * Return true if the frame has the element that was moved to be attached inside of it.
   * @param frameElementId a frame id to check if it has an element to be attached
   */
  isFrameHasElementMoved: (frameElementId: string) => boolean;

  /**
   * Return true if the element is to be attached to the frame.
   * @param elementId an element ID to check if it has a frame to attach to
   */
  isElementMovedHasFrame: (elementId: string) => boolean;
};

export const ElementAttachFrameGetterContext = createContext<
  ElementAttachFrameGetterContextType | undefined
>(undefined);

export function ElementAttachFrameProvider({
  children,
}: PropsWithChildren<{}>) {
  const [elementAttachFrame, setElementAttachFrame] = useState<
    Record<string, string>
  >({});
  const [attachedElementsMovedByFrame, setAttachedElementsMovedByFrame] =
    useState<string[]>([]);
  const [connectingPathIds, setConnectingPathIds] = useState<string[]>([]);

  const context = useMemo<ElementAttachFrameGetterContextType>(
    () => ({
      elementAttachFrame,
      connectingPathIds,
      isFrameHasElementMoved: (frameElementId) =>
        Object.entries(elementAttachFrame).some(
          ([attachmentElementId, attachmentFrameElementId]) =>
            attachmentFrameElementId === frameElementId &&
            !attachedElementsMovedByFrame.includes(attachmentElementId) &&
            !connectingPathIds.includes(attachmentElementId),
        ),
      isElementMovedHasFrame: (elementId) =>
        elementAttachFrame[elementId] !== undefined &&
        !attachedElementsMovedByFrame.includes(elementId) &&
        !connectingPathIds.includes(elementId),
    }),
    [elementAttachFrame, attachedElementsMovedByFrame, connectingPathIds],
  );

  return (
    <ElementAttachFrameSetterContext.Provider
      value={{
        setElementAttachFrame,
        setAttachedElementsMovedByFrame,
        setConnectingPathIds,
      }}
    >
      <ElementAttachFrameGetterContext.Provider value={context}>
        {children}
      </ElementAttachFrameGetterContext.Provider>
    </ElementAttachFrameSetterContext.Provider>
  );
}
