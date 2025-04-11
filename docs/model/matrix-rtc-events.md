# MatrixRTC Events Data Model

Having the option to use MatrixRTC as an alternative to WebRTC introduces some
changes to the datal model.

Specifically, we replace the `net.nordeck.whiteboard.sessions` with MatrixRTC
membership state events and no longer have the need to use To Device Messages
for broadcasting ICE candidates between room members, as all signaling is
now performed by the LiveKit Client SDK and LiveKit Server backend.

## Room Messages

The whiteboard state is stored using the following events in a Matrix room:

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

Each whiteboard document is using the following events in a Matrix room:

```
┌────────────────────────────────────────┐
│                                        │
│ net.nordeck.whiteboard.document.create │
│ event_id ≙ documentId                  │
│                                        │
└────────────────────────────────────────┘
   ▲
   │ m.relates_to: m.reference <documentId>
   └──┬───────────────────────────────────────────────────────────┐...
      │                                                           │
      │                                                           │
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx      xxxxxxxxxxxxxx...
x     │                                              x      x     │
x     │       "Encoded Whiteboard CRDT"              x      x     │
x     │                                              x      x     │
x  ┌──┴───────────────────────────────────────┐      x      x  ┌──┴───────...
x  │                                          │      x      x  │
x  │ net.nordeck.whiteboard.document.snapshot │      x      x  │ net.norde...
x  │ event_id ≙ snapshotId                    │      x      x  │ ...
x  │ content.chunkCount: N                    │      x      x  │ ...
x  │                                          │      x      x  │
x  └──────────────────────────────────────────┘      x      x  └──────────...
x     ▲                                              x      x     ▲
x     │                                              x      x     │
x     │ m.relates_to: m.reference <snapshotId>       x      x     │
x     │                                              x      x     .
x     │   ┌───────────────────────────────────────┐  x      x     .
x     │   │                                       │  x      x     .
x     │   │ net.nordeck.whiteboard.document.chunk │  x      x
x     ├───┤ content.documentId: documentId        │  x      x
x     │   │ content.sequenceNumber: 0             │  x      x
x     │   │ content.data: hW9Kg69...              │  x      x
x     │   │                                       │  x      x
x     │   └───────────────────────────────────────┘  x      x
x     │                                              x      x
x     │   ┌───────────────────────────────────────┐  x      x
x     │   │                                       │  x      x
x     │   │ net.nordeck.whiteboard.document.chunk │  x      x
x     ├───┤ content.documentId: documentId        │  x      x
x     │   │ content.sequenceNumber: 1             │  x      x
x     .   │ content.data: hW9Kg/l...              │  x      x
x     .   │                                       │  x      x
x     .   └───────────────────────────────────────┘  x      x
x                                                    x      x
x                                                    x      x
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx      xxxxxxxxxxxxxx...
```

### `org.matrix.msc3401.call.member` (State Event)

According to [MSC4143: MatrixRTC](MSC4143), a RTC application must keep it's session state in
a state event of type `m.rtc.member` (or the unstable `org.matrix.msc3401.call.member`),
with a state key composed of the user's Matrix ID and the user's Device ID.

This state event will keep RTC and app-specific medatada in it's `content` field.

The termination of a RTC session is signaled by clearing the state event's `content`. This is done using delayed events.

#### Content

| Field                                  | Type     | Description                                                                                        |
| -------------------------------------- | -------- | -------------------------------------------------------------------------------------------------- |
| `application`                          | `string` | The NeoBoard application identifier, which is `net.nordeck.whiteboard`.                            |
| `call_id`                              | `string` | The ID of the Whiteboard for this session, which matches the Widget ID.                            |
| `device_id`                            | `string` | The Device ID of the user's client.                                                                |
| `focus_active`                         | `object` | The currently active backend focus, based on the preferred focus of the oldest RTC session member. |
| `focus_active.type`                    | `array`  | The type of the focus, `livekit` for LiveKit.                                                      |
| `focus_active.livekit_service_url`     | `array`  | The URL of the LiveKit MatrixRTC backend to use for the session.                                   |
| `foci_preferred[]`                     | `array`  | A list                                                                                             |
| `foci_preferred[].type`                | `array`  | The type of the focus, `livekit` for LiveKit.                                                      |
| `foci_preferred[].livekit_service_url` | `array`  | The URL of the LiveKit MatrixRTC backend to use for the session.                                   |
| `scope`                                | `string` | The Device ID of the user's client.                                                                |
| `expires`                              | `number` | The Device ID of the user's client.                                                                |

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

All other events remain as described in [Matrix Events](matrix-events.md)

[matrix-events]: ./matrix-events.md
[MSC4143]: https://github.com/matrix-org/matrix-spec-proposals/blob/toger5/matrixRTC/proposals/4143-matrix-rtc.md
