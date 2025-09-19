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

import { describe, expect, it } from 'vitest';
import { orderMembersByState } from './orderMembersByState';

describe('orderMembersByState', () => {
  it('should order own user first, followed by connected users', () => {
    expect(
      orderMembersByState(
        [
          { userId: '@user-alice:example.com' },
          { userId: '@user-bob:example.com' },
          { userId: '@user-charlie:example.com' },
          { userId: '@user-dave:example.com' },
          { userId: '@user-id:example.com' },
        ],
        '@user-id:example.com',
      ),
    ).toEqual([
      { userId: '@user-id:example.com' },
      { userId: '@user-alice:example.com' },
      { userId: '@user-bob:example.com' },
      { userId: '@user-charlie:example.com' },
      { userId: '@user-dave:example.com' },
    ]);
  });

  it('should always include the own user if list is empty', () => {
    expect(orderMembersByState([], '@user-id:example.com')).toEqual([
      { userId: '@user-id:example.com' },
    ]);
  });

  it('should order presenter user first then own user, followed by connected users', () => {
    expect(
      orderMembersByState(
        [
          { userId: '@user-alice:example.com' },
          { userId: '@user-bob:example.com' },
          { userId: '@user-charlie:example.com' },
          { userId: '@user-dave:example.com' },
          { userId: '@user-id:example.com' },
        ],
        '@user-id:example.com',
        '@user-paul:example.com',
      ),
    ).toEqual([
      { userId: '@user-paul:example.com' },
      { userId: '@user-id:example.com' },
      { userId: '@user-alice:example.com' },
      { userId: '@user-bob:example.com' },
      { userId: '@user-charlie:example.com' },
      { userId: '@user-dave:example.com' },
    ]);
  });

  it('should order own user when he is presenter, followed by connected users', () => {
    expect(
      orderMembersByState(
        [
          { userId: '@user-alice:example.com' },
          { userId: '@user-bob:example.com' },
          { userId: '@user-charlie:example.com' },
          { userId: '@user-dave:example.com' },
          { userId: '@user-id:example.com' },
        ],
        '@user-id:example.com',
        '@user-id:example.com',
      ),
    ).toEqual([
      { userId: '@user-id:example.com' },
      { userId: '@user-alice:example.com' },
      { userId: '@user-bob:example.com' },
      { userId: '@user-charlie:example.com' },
      { userId: '@user-dave:example.com' },
    ]);
  });
});
