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

import CloseIcon from '@mui/icons-material/Close';
import {
  Button,
  Card,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { unstable_useId as useId } from '@mui/utils';
import { omit } from 'lodash';
import { useTranslation } from 'react-i18next';
import { TooltipRenderProps } from 'react-joyride';

export function StyledJoyrideStep({
  step,
  continuous,
  size: stepCount,
  index,
  backProps,
  closeProps,
  primaryProps,
  tooltipProps,
  isLastStep,
}: TooltipRenderProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const descriptionId = useId();

  return (
    <Card
      elevation={24}
      {...tooltipProps}
      sx={(theme) => ({
        minWidth: 0,
        maxWidth: 500,
        borderColor: theme.palette.primary.main,
      })}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <Stack alignItems="baseline" direction="row">
        <DialogTitle component="h3" id={titleId} sx={{ flex: 1 }}>
          {step.title}
        </DialogTitle>
        <Tooltip title={t('boardBar.exportWhiteboardDialog.close', 'Close')}>
          <IconButton
            sx={{ mr: 3 }}
            {...omit(closeProps, 'aria-label', 'title')}
          >
            <CloseIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      <DialogContent sx={{ pt: 0 }}>
        <DialogContentText
          component="div"
          id={descriptionId}
          sx={{
            '& > p:first-of-type': { mt: 0 },
            '& > p:last-of-type': { mb: 0 },
          }}
        >
          {step.content}
        </DialogContentText>
      </DialogContent>

      <DialogActions>
        <Typography variant="body1" color="text.secondary" flex={1}>
          {t('guidedTour.slideCount', '{{index}} of {{total}}', {
            index: index + 1,
            total: stepCount,
          })}
        </Typography>

        {index > 0 && (
          <Button
            {...omit(backProps, 'aria-label', 'title')}
            variant="outlined"
          >
            {t('guidedTour.back', 'Back')}
          </Button>
        )}
        {continuous && (
          <Button
            {...omit(primaryProps, 'aria-label', 'title')}
            variant="contained"
          >
            {isLastStep
              ? t('guidedTour.complete', 'Complete')
              : t('guidedTour.next', 'Next')}
          </Button>
        )}
      </DialogActions>
    </Card>
  );
}
