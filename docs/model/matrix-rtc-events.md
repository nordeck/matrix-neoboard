# MatrixRTC Events Data Model

Having the option to use MatrixRTC as an alternative to WebRTC introduces some
changes to the data model.

Specifically, we replace the `net.nordeck.whiteboard.sessions`events with the
`m.rtc.member` MatrixRTC membership state events (or the unstable `org.matrix.msc3401.call.member`)
and no longer need to use To Device Messages for establishing peer connections,
as all signaling and connection logic is now handled by the LiveKit Client SDK
and LiveKit Server backend.

## Room Messages

The whiteboard state and RTC session membership is stored using the following events in a Matrix room:

```
┌────────────────────────────────┐                  ┌────────────────────────────────────┐
│                                │                  │                                    │
│ net.nordeck.whiteboard         │◄─────────────────┤ org.matrix.msc3401.call.member     │
│ (state_key: <whiteboard-id>)   │  (whiteboard-id) │ (state_key: _<user_id>_<device_id>)│
│                                │                  │                                    │
└──┬─────────────────────────────┘                  └────────────────────────────────────┘
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

### `org.matrix.msc3401.call.member` (State Event)

According to [MSC4143: MatrixRTC](MSC4143), a RTC application must keep it's session state in
a state event of type `m.rtc.member` (or the unstable `org.matrix.msc3401.call.member`),
with a state key composed of the user's Matrix ID and the user's Device ID.

This state event will keep RTC and app-specific medatada in it's `content` field.

The termination of a RTC session is signaled by clearing the state event's `content`. This is done using delayed events.

#### Content

| Field                                  | Type     | Description                                                                |
| -------------------------------------- | -------- | -------------------------------------------------------------------------- |
| `application`                          | `string` | The NeoBoard application identifier, which is `net.nordeck.whiteboard`.    |
| `call_id`                              | `string` | The ID of the Whiteboard for this session, which matches the Widget ID.    |
| `device_id`                            | `string` | The Device ID of the user's client.                                        |
| `focus_active`                         | `object` | The currently active backend focus type and focus selection strategy.      |
| `focus_active.type`                    | `string` | The type of the focus, `livekit` for LiveKit.                              |
| `focus_active.focus_selection`         | `string` | The focus selection strategy. Currently only supports `oldest_membership`. |
| `foci_preferred[]`                     | `array`  | A list of possible foci this user knows about.                             |
| `foci_preferred[].type`                | `string` | The type of the focus, `livekit` for LiveKit.                              |
| `foci_preferred[].livekit_service_url` | `string` | The URL of the LiveKit MatrixRTC backend to use for the session.           |
| `scope`                                | `string` | The scope of the RTC session. Only supported value is 'm.room'.            |
| `expires`                              | `number` | The expiration timestamp for this session membership.                      |

#### Example

```json
{
  "type": "org.matrix.msc3401.call.member",
  "sender": "@alice:matrix.internal",
  "content": {
    "application": "net.nordeck.whiteboard",
    "call_id": "whiteboard-id",
    "device_id": "SDXDZRNDJA",
    "focus_active": {
      "type": "livekit",
      "focus_selection": "oldest_membership"
    },
    "foci_preferred": [
      {
        "type": "livekit",
        "livekit_service_url": "https//livekit-jwt.matrix.internal"
      }
    ],
    "scope": "m.room",
    "expires": 1743778636001
  },
  "state_key": "_@alice:matrix.internal_SDXDZRNDJA",
  "origin_server_ts": 1743764236021,
  "unsigned": {
    "membership": "join",
    "age": 68
  },
  "event_id": "$bFsA4Obl-sneiJlq4SAM2WGMLe00ie3f-Mod7VQfF_c",
  "room_id": "!BWCjlIjHYWgJyZySxE:matrix.internal"
}
```

[matrix-events]: ./matrix-events.md
[MSC4143]: https://github.com/matrix-org/matrix-spec-proposals/blob/toger5/matrixRTC/proposals/4143-matrix-rtc.md
