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

import { omit } from 'lodash';
import React, { AriaAttributes, forwardRef, ReactElement } from 'react';

/**
 * A component that allows to have disabled buttons in a tooltip.
 *
 * It creates a span element but ignores all aria-label and
 * aria-labelledby attributes so no unintended accessible groups
 * are created.
 */
export const TooltipDisabledChildWrapper = forwardRef<
  HTMLSpanElement,
  { children: ReactElement } & AriaAttributes
>(function TooltipDisabledChildWrapper({ children, ...props }, innerRef) {
  const spanProps = omit(props, 'aria-label', 'aria-labelledby');

  return (
    <span {...spanProps} ref={innerRef}>
      {React.Children.only(children)}
    </span>
  );
});
