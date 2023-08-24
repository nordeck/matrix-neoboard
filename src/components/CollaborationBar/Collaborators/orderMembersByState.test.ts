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

import { orderMembersByState } from './orderMembersByState';

describe('orderMembersByState', () => {
  it('should order own user first, followed by connected and recently active users', () => {
    expect(
      orderMembersByState(
        [
          { userId: '@user-alice' },
          { userId: '@user-bob' },
          { userId: '@user-charlie' },
          { userId: '@user-dave' },
          { userId: '@user-id' },
        ],
        '@user-id',
      ),
    ).toEqual([
      { userId: '@user-id' },
      { userId: '@user-alice' },
      { userId: '@user-bob' },
      { userId: '@user-charlie' },
      { userId: '@user-dave' },
    ]);
  });

  it('should always include the own user if list is empty', () => {
    expect(orderMembersByState([], '@user-id')).toEqual([
      { userId: '@user-id' },
    ]);
  });
});
