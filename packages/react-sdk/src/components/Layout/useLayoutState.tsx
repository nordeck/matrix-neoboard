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

import { grey } from '@mui/material/colors';
import {
  createContext,
  PropsWithChildren,
  useContext,
  useMemo,
  useState,
} from 'react';
import { Point } from '../../state';
import { useFullscreenMode } from './useFullscreenMode';

export type ActiveTool =
  | 'select'
  | 'text'
  | 'rectangle'
  | 'rounded-rectangle'
  | 'polyline'
  | 'line'
  | 'arrow'
  | 'ellipse'
  | 'triangle';

type LayoutState = {
  isSlideOverviewVisible: boolean;
  isDeveloperToolsVisible: boolean;
  isShowCollaboratorsCursors: boolean;
  isShowGrid: boolean;
  activeTool: ActiveTool;
  activeColor: string;
  setSlideOverviewVisible: (value: boolean) => void;
  setDeveloperToolsVisible: (value: boolean) => void;
  setShowCollaboratorsCursors: (value: boolean) => void;
  setShowGrid: (value: boolean) => void;
  setActiveTool: (tool: ActiveTool) => void;
  setActiveColor: (color: string) => void;
  /**
   * Whether the layout is displayed in fullscreen mode.
   */
  isFullscreenMode: boolean;
  /**
   * Set fullscreen mode.
   *
   * @param fullscreen - true to go fullscreen mode; false to go to non-fullscreen mode
   */
  setFullscreenMode: (fullscreen: boolean) => Promise<void>;
  /**
   * Holds the Point where a drag-select action has been started.
   * undefined if there is no drag-select action.
   */
  dragSelectStartCoords?: Point;
  /**
   * Set or clear the drag select start coordinates.
   *
   * @param point - Point to start a drag select action from or undefined to clear the drag selection
   */
  setDragSelectStartCoords: (point?: Point) => void;
};

const LayoutStateContext = createContext<LayoutState | undefined>(undefined);

export function LayoutStateProvider({ children }: PropsWithChildren<{}>) {
  const [isSlideOverviewVisible, setSlideOverviewVisible] =
    useState<boolean>(false);
  const [isDeveloperToolsVisible, setDeveloperToolsVisible] =
    useState<boolean>(false);
  const [isShowCollaboratorsCursors, setShowCollaboratorsCursors] =
    useState<boolean>(false);
  const [isShowGrid, setShowGrid] = useState<boolean>(true);
  const [activeTool, setActiveTool] = useState<ActiveTool>('select');
  const [activeColor, setActiveColor] = useState<string>(grey[500]);
  const { isFullscreenMode, setFullscreenMode } = useFullscreenMode();
  const [dragSelectStartCoords, setDragSelectStartCoords] = useState<Point>();

  const value = useMemo(
    () => ({
      isSlideOverviewVisible,
      isDeveloperToolsVisible,
      isShowCollaboratorsCursors,
      isShowGrid,
      activeTool,
      activeColor,
      setSlideOverviewVisible,
      setDeveloperToolsVisible,
      setShowCollaboratorsCursors,
      setShowGrid,
      setActiveTool,
      setActiveColor,
      isFullscreenMode,
      setFullscreenMode,
      dragSelectStartCoords,
      setDragSelectStartCoords,
    }),
    [
      activeColor,
      activeTool,
      isDeveloperToolsVisible,
      isShowCollaboratorsCursors,
      isShowGrid,
      isSlideOverviewVisible,
      isFullscreenMode,
      setFullscreenMode,
      dragSelectStartCoords,
      setDragSelectStartCoords,
    ],
  );

  return (
    <LayoutStateContext.Provider value={value}>
      {children}
    </LayoutStateContext.Provider>
  );
}

export function useLayoutState(): LayoutState {
  const layoutState = useContext(LayoutStateContext);

  if (!layoutState) {
    throw new Error(
      'useLayoutState can only be used inside of <LayoutStateProvider>',
    );
  }

  return layoutState;
}
