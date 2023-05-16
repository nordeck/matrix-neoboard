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

import { Typography } from '@mui/material';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { isMacOS } from '../platform';
import { formatKey, parseHotKeys, splitHotKeys } from './hotkeyUtils';

export function HotkeyHelp({ keys }: { keys: string }) {
  const { t } = useTranslation();

  return (
    <Typography component="kbd" variant="body2" letterSpacing="0.1em">
      {parseHotKeys(keys).map((k, i) => (
        <Fragment key={i}>
          {i > 0 && !isMacOS() && '+'}

          <Typography component="kbd" variant="body2">
            {formatKey(k, t)}
          </Typography>
        </Fragment>
      ))}
    </Typography>
  );
}

export function HotkeysHelp({ keys }: { keys: string | string[] }) {
  if (!Array.isArray(keys)) {
    keys = splitHotKeys(keys);
  }

  return (
    <>
      {keys.map((k, i) => (
        <Fragment key={i}>
          {i > 0 && <> | </>}
          <HotkeyHelp keys={k} />
        </Fragment>
      ))}
    </>
  );
}
