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

import { Box, CircularProgress, Typography } from '@mui/material';
import { unstable_useId as useId } from '@mui/utils';

type PageLoaderProps = {
  text?: string;
};

export function PageLoader({ text }: PageLoaderProps) {
  const messageTitleId = useId();

  return (
    <Box
      alignItems="center"
      display="flex"
      flexDirection="column"
      height="100vh"
      justifyContent="center"
      p={2}
      width="100%"
      position="fixed"
    >
      <CircularProgress aria-labelledby={text ? messageTitleId : undefined} />
      {text && (
        <Typography id={messageTitleId} variant="h3" mt={2}>
          {text}
        </Typography>
      )}
    </Box>
  );
}
