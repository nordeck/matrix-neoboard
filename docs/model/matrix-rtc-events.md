# MatrixRTC Events Data Model

Having the option to use MatrixRTC as an alternative to WebRTC introduces some
changes:

We replace the `net.nordeck.whiteboard` state event with the MatrixRTC `m.rtc.slot` state event
(or the unstable `org.matrix.msc4143.rtc.slot`).

We replace the `net.nordeck.whiteboard.sessions` state event with the
MatrixRTC `m.rtc.member` membership **sticky** event (or the unstable `org.matrix.msc4143.rtc.member`).

We no longer need to use To Device Messages for establishing peer connections.
All signaling and connection logic is now handled by the LiveKit Client SDK and LiveKit Server backend.

## Room Events

The whiteboard state and RTC membership is stored using the following events in a Matrix room:

```
┌───────────────────────────────────────────────────┐
│                                                   │
│ org.matrix.msc4143.rtc.slot                       │                    ┌───────────────────────────────┐
│ state_key: net.nordeck.whiteboard#<whiteboard-id> │   content.slot_id  │                               │
│ content.status: open                              │◄───────────────────┤ org.matrix.msc4143.rtc.member │
│ content.application.type: net.nordeck.whiteboard  │                    │                               │
│                                                   │                    └───────────────────────────────┘
└──┬────────────────────────────────────────────────┘
   │
   │ content.documentId
   │
   ▼
┌────────────────────────────────────────┐
│                                        │ ◄─────── <net.nordeck.whiteboard.document.snapshot>
│ net.nordeck.whiteboard.document.create │
│ event_id ≙ documentId                  │ ◄─────── <net.nordeck.whiteboard.document.snapshot>
│                                        │
└────────────────────────────────────────┘    ...
```

All other events and relations remain as described in [Matrix Events](matrix-events.md)

### `org.matrix.msc4143.rtc.slot` (State event)

This is a renamed `net.nordeck.whiteboard` event with [MSC4143: MatrixRTC][MSC4143] slot specific fields
added to the content: `status`, `application.type`.

#### Fields

| Field                    | Type                     | Description                                              |
| ------------------------ | ------------------------ | -------------------------------------------------------- |
| `status`                 | `string`                 | A slot's status, either 'open' or 'closed'.                                         |
| `application.type`       | `string` | Nordeck whiteboard application identifier: `net.nordeck.whiteboard`               |
| `application.documentId` | `string`                 | A `net.nordeck.whiteboard.document.create` room event id |

#### Example

```json
{
  "type": "org.matrix.msc4143.rtc.slot",
  "sender": "@user-id:example.com",
  "state_key": "net.nordeck.whiteboard#whiteboard-id",
  "content": {
    "status": "open",
    "application": {
      "type": "net.nordeck.whiteboard",
      "documentId": "$H1-nssrxUGbrMdKSDJcACCpmc4PrClb2WDSOrGUv6bs"
    }
  },
  "event_id": "$event-id",
  "origin_server_ts": 1665134498391,
  "room_id": "!room-id:example.com"
}
```

### `org.matrix.msc4143.rtc.member` (Sticky event) with `join` membership

According to [MSC4143: MatrixRTC][MSC4143], a RTC application must keep it's membership data in
the sticky event of type `m.rtc.member` with `member.membership` to be `join`.

Sending a `m.rtc.member` event with `membership` equal to `join` for an opened slot opens a session.

#### Fields

| Field                       | Type                       | Description                                                                     |
| --------------------------- | -------------------------- | ------------------------------------------------------------------------------- |
| `slot_id`                   | `string`                   | A MatrixRTC slot ID, example: `net.nordeck.whiteboard#whiteboard-id`            |
| `member.id`                 | `string`                   | A unique user identifier for each join, even for the same user and device.      |
| `member.membership`         | `'join'`                   | Identifies membership event as `join`.                                          |
| `member.deviceId`           | `string`                   | The Device ID of the user's client.                                             |
| `application.type`          | `'net.nordeck.whiteboard'` | Nordeck whiteboard application identifier.                                      |
| `application.whiteboard_id` | `string`                   | A whiteboard id.                                                                |
| `transports.published[]`    | `array`                    | Array of transports used by member to publish media, see MatrixRTC transports.   |
| `transports.can_subscribe`  | `array`                    | Array of transports member can subscribe to. At the moment: `['livekit']` only. |
| `msc4354_sticky_key`        | `string`                   | The sticky key. Must be the same as `member.id`.                                |

#### Example

```json
{
  "type": "org.matrix.msc4143.rtc.member",
  "sender": "@user-id:example.com",
  "content": {
    "slot_id": "net.nordeck.whiteboard#whiteboard-id",
    "member": {
      "id": "$member-id-0",
      "membership": "join",
      "device_id": "$device-id-0"
    },
    "application": {
      "type": "net.nordeck.whiteboard",
      "whiteboard_id": "whiteboard-id"
    },
    "transports": {
      "published": [
        {
          "type": "livekit",
          "livekit_service_url": "https://livekit-jwt.example.com"
        }
      ],
      "can_subscribe": ["livekit"]
    },
    "msc4354_sticky_key": "$member-id-0"
  },
  "origin_server_ts": 0,
  "event_id": "$event-id",
  "room_id": "!room-id:example.com"
}
```

### `org.matrix.msc4143.rtc.member` (Sticky event) with `leave` membership

A session is terminated when a `m.rtc.member` event with a `leave` `membership` is sent.

The `leave_reason.code` is set to `leave` when users leaves intentionally.

The `leave_reason.code` is set to `delayed_leave` when user's [MSC4140 delayed event][MSC4140] to leave is sent.

#### Fields

| Field                | Type                         | Description                                                                |
| -------------------- | ---------------------------- | -------------------------------------------------------------------------- |
| `slot_id`            | `string`                     | A MatrixRTC slot ID, example: `net.nordeck.whiteboard#whiteboard-id`       |
| `member.id`          | `string`                     | A unique user identifier for each join, even for the same user and device. |
| `member.membership`  | `'leave'`                    | Identifies membership event as `leave`.                                   |
| `member.deviceId`    | `string`                     | The Device ID of the user's client.                                        |
| `leave_reason.code`  | `'leave' \| 'delayed_leave'` | Leave code.                                                                |
| `msc4354_sticky_key` | `string`                     | The sticky key. Must be the same as `member.id`.                           |

#### Example

```json
{
  "type": "org.matrix.msc4143.rtc.member",
  "sender": "@user-id:example.com",
  "content": {
    "slot_id": "net.nordeck.whiteboard#whiteboard-id",
    "member": {
      "id": "$member-id-0",
      "membership": "leave",
      "device_id": "$device-id-0"
    },
    "leave_reason": {
      "code": "leave"
    },
    "msc4354_sticky_key": "$member-id-0"
  },
  "origin_server_ts": 0,
  "event_id": "$event-id",
  "room_id": "!room-id:example.com",
  "msc4354_sticky": {
    "duration_ms": 3600000
  }
}
```

[matrix-events]: ./matrix-events.md
[MSC4143]: https://github.com/matrix-org/matrix-spec-proposals/blob/toger5/matrixRTC/proposals/4143-matrix-rtc.md
[MSC4140]: https://github.com/matrix-org/matrix-spec-proposals/blob/toger5/expiring-events-keep-alive/proposals/4140-delayed-events-futures.md
