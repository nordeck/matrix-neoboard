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
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type ActiveTool =
  | 'select'
  | 'text'
  | 'rectangle'
  | 'polyline'
  | 'line'
  | 'ellipse'
  | 'triangle';

type LayoutState = {
  isSlideOverviewVisible: boolean;
  isDeveloperToolsVisible: boolean;
  isShowCollaboratorsCursors: boolean;
  isShowGrid: boolean;
  activeTool: ActiveTool;
  activeColor: string;
  isFullscreen: boolean;
  setSlideOverviewVisible: (value: boolean) => void;
  setDeveloperToolsVisible: (value: boolean) => void;
  setShowCollaboratorsCursors: (value: boolean) => void;
  setShowGrid: (value: boolean) => void;
  setActiveTool: (tool: ActiveTool) => void;
  setActiveColor: (color: string) => void;
  setFullscreen: (value: boolean) => void;
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
  const [isFullscreen, setFullscreenRaw] = useState(false);

  const setFullscreen = useCallback((value: boolean) => {
    if (value && !document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else if (!value && document.fullscreenElement) {
      document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    function listener(e: unknown) {
      setFullscreenRaw(document.fullscreenElement !== null);
    }

    document.addEventListener('fullscreenchange', listener);

    return () => {
      document.removeEventListener('fullscreenchange', listener);
    };
  }, [isFullscreen]);

  const value = useMemo(
    () => ({
      isSlideOverviewVisible,
      isDeveloperToolsVisible,
      isShowCollaboratorsCursors,
      isShowGrid,
      activeTool,
      activeColor,
      isFullscreen,
      setSlideOverviewVisible,
      setDeveloperToolsVisible,
      setShowCollaboratorsCursors,
      setShowGrid,
      setActiveTool,
      setActiveColor,
      setFullscreen,
    }),
    [
      activeColor,
      activeTool,
      isDeveloperToolsVisible,
      isFullscreen,
      isShowCollaboratorsCursors,
      isShowGrid,
      isSlideOverviewVisible,
      setFullscreen,
    ]
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
      'useLayoutState can only be used inside of <LayoutStateProvider>'
    );
  }

  return layoutState;
}
