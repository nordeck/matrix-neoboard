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

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Tab } from '@mui/base';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { alpha, Stack, styled, Tooltip, Typography } from '@mui/material';
import { unstable_useId as useId, visuallyHidden } from '@mui/utils';
import { useTranslation } from 'react-i18next';
import { SlideProvider, useSlideIsLocked } from '../../state';
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
  slideId: string;
  slideIndex: number;
  active?: boolean;
};

export function SlideListItem({
  slideId,
  slideIndex,
  active = false,
}: SlideListItemProps) {
  const { t } = useTranslation('neoboard');
  const isLocked = useSlideIsLocked(slideId);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isSorting,
    node,
  } = useSortable({ id: slideId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const titleId = useId();
  const descriptionId = useId();

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TabWithContextMenu
        innerRef={node}
        slots={{ root: 'div' }}
        disabled={isDragging || isSorting}
        role="tab"
        tabIndex={active ? 0 : -1}
        value={slideId}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        aria-haspopup="menu"
        slideId={slideId}
        slideIndex={slideIndex}
      >
        <Typography sx={visuallyHidden} id={descriptionId}>
          {t(
            'slideOverviewBar.dragAndDrop.dragInstructions',
            'Press the M key to start a drag. When dragging you can use the arrow keys to move the item around and escape to cancel. Ensure your screen reader is in focus mode or forms mode.',
          )}
        </Typography>

        <SlideProvider slideId={slideId}>
          <SlidePreview />
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
            {t('slideOverviewBar.slideTitle', 'Slide')}
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
    </div>
  );
}
