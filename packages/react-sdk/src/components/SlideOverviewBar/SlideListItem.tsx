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

import { Tab } from '@mui/base';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { alpha, Stack, styled, Tooltip, Typography } from '@mui/material';
import { unstable_useId as useId, visuallyHidden } from '@mui/utils';
import { Draggable } from 'react-beautiful-dnd';
import { useTranslation } from 'react-i18next';
import { isInfiniteCanvasMode } from '../../lib';
import {
  SlideProvider,
  useActiveWhiteboardInstanceSlideIds,
  useSlideIsLocked,
} from '../../state';
import { SlidePreview } from '../Whiteboard';
import { withContextMenu } from './withContextMenu';

const TabStyled = styled(Tab)(({ theme, 'aria-selected': ariaSelected }) => ({
  border: 'none',
  padding: 0,
  overflow: 'hidden',
  marginBottom: theme.spacing(1),
  borderRadius: theme.shape.borderRadius,
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: ariaSelected
    ? theme.palette.primary.main
    : theme.palette.divider,
  textAlign: 'left',
  color: theme.palette.text.primary,
  backgroundColor: theme.palette.background.default,
  // Position relative is required to have an anchor for the elements that use
  // position absolute (visually hidden)
  position: 'relative',
}));

const TabWithContextMenu = withContextMenu(TabStyled);

export type SlideListItemProps = {
  slideOrFrameId: string;
  slideIndex: number;
  active?: boolean;
};

export function SlideListItem({
  slideOrFrameId,
  slideIndex,
  active = false,
}: SlideListItemProps) {
  const slideIds = useActiveWhiteboardInstanceSlideIds();
  const { t } = useTranslation('neoboard');
  const isLocked = useSlideIsLocked(
    isInfiniteCanvasMode() ? undefined : slideOrFrameId,
  );

  const titleId = useId();
  const descriptionId = useId();

  return (
    <Draggable
      draggableId={slideOrFrameId}
      index={slideIndex}
      disableInteractiveElementBlocking={true}
    >
      {(provided, snapshot) => (
        <TabWithContextMenu
          slots={{ root: 'div' }}
          innerRef={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          // disable the item on dragging to trigger an internal resorting of
          // the tab order for the keyboard navigation. See also
          // https://github.com/mui/material-ui/issues/36800
          disabled={snapshot.isDragging || snapshot.isDropAnimating}
          role="tab"
          tabIndex={active ? 0 : -1}
          value={slideOrFrameId}
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          aria-haspopup="menu"
          slideId={slideOrFrameId}
          slideIndex={slideIndex}
        >
          <Typography sx={visuallyHidden} id={descriptionId}>
            {t(
              'slideOverviewBar.dragAndDrop.dragInstructions',
              'Press the M key to start a drag. When dragging you can use the arrow keys to move the item around and escape to cancel. Ensure your screen reader is in focus mode or forms mode.',
            )}
          </Typography>

          <SlideProvider
            slideId={isInfiniteCanvasMode() ? slideIds[0] : slideOrFrameId}
          >
            <SlidePreview
              frameElementId={
                isInfiniteCanvasMode() ? slideOrFrameId : undefined
              }
            />
          </SlideProvider>

          <Stack
            direction="row"
            id={titleId}
            borderTop="1px solid"
            borderColor="divider"
            px={2}
            py={1}
            bgcolor={(theme) =>
              active
                ? alpha(
                    theme.palette.primary.main,
                    theme.palette.action.activatedOpacity,
                  )
                : undefined
            }
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography component="span" sx={visuallyHidden}>
              {isInfiniteCanvasMode()
                ? t('slideOverviewBar.frameTitle', 'Frame')
                : t('slideOverviewBar.slideTitle', 'Slide')}
            </Typography>{' '}
            {slideIndex + 1}
            {isLocked && (
              <>
                {' '}
                <Typography component="span" sx={visuallyHidden}>
                  {t('slideOverviewBar.slideTitleLocked', '(locked)')}
                </Typography>
                <Tooltip
                  title={t('slideOverviewBar.slideLockedTooltip', 'Locked')}
                >
                  <LockOutlinedIcon fontSize="small" />
                </Tooltip>
              </>
            )}
          </Stack>
        </TabWithContextMenu>
      )}
    </Draggable>
  );
}
