# Events Data Model

The Matrix protocol is used as the base communication and storage layer for the whiteboard.

## Room Messages

The whiteboard state is stored using the following events in a Matrix room:

```
┌────────────────────────────────┐                  ┌─────────────────────────────────┐
│                                │                  │                                 │
│ net.nordeck.whiteboard         │◄─────────────────┤ net.nordeck.whiteboard.sessions │
│ (state_key: <whiteboard-id>)   │  (whiteboard-id) │ (state_key: <user-id>)          │
│                                │                  │                                 │
└──┬─────────────────────────────┘                  └─────────────────────────────────┘
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

### `net.nordeck.whiteboard` (State Event)

Holds a single whiteboard.
As being an unencrypted state event, this event doesn't hold any relevant data, but only metadata.
The metadata is used to reference other room events that contain the actual whiteboard contents.

The `state_key` of the event is also referred to as _whiteboard id_.

#### Content

| Field        | Type     | Description                                                                                         |
| ------------ | -------- | --------------------------------------------------------------------------------------------------- |
| `documentId` | `string` | The room event of a `net.nordeck.whiteboard.document.create` event that stores the whiteboard CRDT. |

#### Example

```json
{
  "type": "net.nordeck.whiteboard",
  "sender": "@user-id",
  "state_key": "<whiteboard-id>",
  "content": {
    "documentId": "$H1-nssrxUGbrMdKSDJcACCpmc4PrClb2WDSOrGUv6bs"
  },
  "event_id": "$event-id",
  "room_id": "!room-id",
  "origin_server_ts": 1665134498391
}
```

### `net.nordeck.whiteboard.document.create` (Room Event)

Holds the content of a whiteboard CRDT.
This event doesn't hold any relevant data, but is only an anchor point to retrieve document snapshots that relate to this event with `m.reference` event relations.
Holds a single whiteboard.

The `event_id` of the event is also referred to as _document id_.

#### Content

No content.

#### Example

```json
{
  "type": "net.nordeck.whiteboard.document.create",
  "sender": "@user-id",
  "state_key": "<whiteboard-id>",
  "content": {},
  "event_id": "$document-create-event-id",
  "room_id": "!room-id",
  "origin_server_ts": 1665134498391
}
```

### `net.nordeck.whiteboard.document.snapshot` (Room Event)

A document snapshot that holds a version of the whiteboard CRDT.
This event doesn't hold any relevant data, but is only an anchor point to retrieve data chunks that relate to this event with `m.reference` event relations.
The newest complete snapshot in the room represents the latest whiteboard content.

The `event_id` of the event is also referred to as _snapshot id_.

#### Content

| Field                     | Type     | Description                                        |
| ------------------------- | -------- | -------------------------------------------------- |
| `chunkCount`              | `number` | The number of chunks that represent this snapshot. |
| `"m.relates_to"`          | —        | The relation to the create event.                  |
| `"m.relates_to".rel_type` | `string` | The type of relation. Must be `m.reference`.       |
| `"m.relates_to".event_id` | `string` | The event_id that this event relates to.           |

#### Example

```json
{
  "type": "net.nordeck.whiteboard.document.snapshot",
  "sender": "@user-id",
  "state_key": "<whiteboard-id>",
  "content": {
    "chunkCount": 1,
    "m.relates_to": {
      "rel_type": "m.reference",
      "event_id": "$document-create-event-id"
    }
  },
  "event_id": "$document-snapshot-event-id",
  "room_id": "!room-id",
  "origin_server_ts": 1665134498392
}
```

### `net.nordeck.whiteboard.document.chunk` (Room Event)

A part of a document snapshot.
Concatenate the decoded content of each snapshot chunk in `sequenceNumber` order to restore the complete snapshot data.

#### Content

| Field                     | Type     | Description                                                              |
| ------------------------- | -------- | ------------------------------------------------------------------------ |
| `documentId`              | `string` | The id of the document that the snapshot chunk belongs to.               |
| `sequenceNumber`          | `number` | The chunk number inside the snapshot. An integer from `0..chunkCount-1`. |
| `data`                    | `string` | A base64 representation of a data chunk.                                 |
| `"m.relates_to"`          | —        | The relation to the snapshot event.                                      |
| `"m.relates_to".rel_type` | `string` | The type of relation. Must be `m.reference`.                             |
| `"m.relates_to".event_id` | `string` | The event_id that this event relates to.                                 |

#### Example

```json
{
  "type": "net.nordeck.whiteboard.document.chunk",
  "sender": "@user-id",
  "state_key": "<whiteboard-id>",
  "content": {
    "documentId": "$document-create-event-id",
    "sequenceNumber": 1,
    "data": "hW9Kg69...",
    "m.relates_to": {
      "rel_type": "m.reference",
      "event_id": "$document-snapshot-event-id"
    }
  },
  "event_id": "$event-id",
  "room_id": "!room-id",
  "origin_server_ts": 1665134498393
}
```

### `net.nordeck.whiteboard.sessions` (State Event)

The sessions event indicates what active sessions of the whiteboard widget a user currently has.
This event is shared between all whiteboards in a room.
A user might have multiple sessions if he opens the same whiteboard on multiple devices.

The list of sessions might contain outdated sessions, if the widget detects that a connection to a session can not be established, the session is ignored.
If a session is expired (see `expiresTs`), the session should be filtered out when the event is written the next time.
The widget has to make sure to update the session in case the expiration is reached soon, but the session hasn't ended yet.

The user id of the user is used as a `state_key`, so every user has its own instance of this event.
The homeserver prevents modifications to events with a `@` prefixed state key by other users.
However, till [MSC 3757][msc3757] is implemented, it's still required to grant the necessary power level to the user.

#### Content

| Field                     | Type     | Description                                                                                                                                          |
| ------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sessions[]`              | `array`  | An array of sessions of this user.                                                                                                                   |
| `sessions[].sessionId`    | `string` | The id of the session, randomly chosen by the widget.                                                                                                |
| `sessions[].whiteboardId` | `string` | The id of the whiteboard that this session is related to.                                                                                            |
| `sessions[].expiresTs`    | `number` | A unix timestamp indicating till when the session is valid. If a session is expired it can be filtered out the next time the state event is written. |

#### Example

```json
{
  "type": "net.nordeck.whiteboard.sessions",
  "sender": "@user-id",
  "state_key": "@user-id",
  "content": {
    "sessions": [
      {
        "whiteboardId": "whiteboard-id",
        "sessionId": "session-id",
        "expiresTs": 1665134598391
      }
    ]
  },
  "event_id": "$event-id",
  "room_id": "!room-id",
  "origin_server_ts": 1665134498391
}
```

## To Device Messages

Beside storage in the room, [_to device messages_](todevicemessages) are used to communicate between users.

### `net.nordeck.whiteboard.connection_signaling`

A to device message that is used to transmit [signaling information](mdnsignaling) during a WebRTC connection setup.

A signaling message can contain a `description` and/or `candidates`.
Multiple messages are exchanged during the connection setup.
If possible, the events should be encrypted.

#### Content

| Field                           | Type                | Description                                                                                                                                                                                                                                                                                       |
| ------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sessionId`                     | `string`            | The receivers session id that this signaling message belongs to.                                                                                                                                                                                                                                  |
| `connectionId`                  | `string`            | The unique connection id that this signaling message belongs to. The connection id is built from concatenating the local and the remote session id with a `_` separator in between. The session with the highest lexicographical order comes first.                                               |
| `description`                   | `array?`            | An optional description, the JSON representation of a [`RTCSessionDescription`](rtcsessiondescription).                                                                                                                                                                                           |
| `description.sdp`               | `string?`           | An optional SDP (session description protocol).                                                                                                                                                                                                                                                   |
| `candidates[]`                  | `array?`            | An optional list of ICE candidates, the JSON representation of a [`RTCIceCandidate`](rtcicecandidate) or `null` to indicate the end of the candidate discovery. The list might be incomplete and further candidates can be transmitted in a later message till a `null` candidate is transmitted. |
| `candidates[].candidate`        | `string?`           | An optional description of the network connectivity information of the candidate.                                                                                                                                                                                                                 |
| `candidates[].sdpMLineIndex`    | `(number \| null)`  | An optional string containing the identification tag of the media stream with which the candidate is associated.                                                                                                                                                                                  |
| `candidates[].sdpMid`           | `(string \| null)?` | An optional number property containing the zero-based index of the m-line with which the candidate is associated, within the SDP of the media description.                                                                                                                                        |
| `candidates[].usernameFragment` | `(string \| null)?` | An optional string containing the username fragment.                                                                                                                                                                                                                                              |

#### Example

A signaling message to provide the other peer a connection offer:

```json
{
  "content": {
    "sessionId": "F8hvkd6aOvo0zrd_Ao5ou",
    "connectionId": "UhuME5n36U6mRkOESYa-W_F8hvkd6aOvo0zrd_Ao5ou",
    "description": {
      "type": "offer",
      "sdp": "v=0\r\no=- 8185730903366058419 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE 0\r\na=extmap-allow-mixed\r\na=msid-semantic: WMS\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\nc=IN IP4 0.0.0.0\r\na=ice-ufrag:hVWA\r\na=ice-pwd:lMj7TeluZCPrcvz3KvZDA5jz\r\na=ice-options:trickle\r\na=fingerprint:sha-256 DA:01:49:B8:30:32:18:9D:24:10:59:0E:CB:74:2C:28:20:63:2C:32:78:71:D4:E1:C6:92:4D:7A:E7:E1:24:8E\r\na=setup:actpass\r\na=mid:0\r\na=sctp-port:5000\r\na=max-message-size:262144\r\n"
    }
  },
  "type": "net.nordeck.whiteboard.connection_signaling",
  "sender": "@user-id",
  "encrypted": false
}
```

A signaling message containing an answer:

```json
{
  "content": {
    "sessionId": "UhuME5n36U6mRkOESYa-W",
    "connectionId": "UhuME5n36U6mRkOESYa-W_F8hvkd6aOvo0zrd_Ao5ou",
    "description": {
      "type": "answer",
      "sdp": "v=0\r\no=- 5203672396519165601 4 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE 0\r\na=extmap-allow-mixed\r\na=msid-semantic: WMS\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\nc=IN IP4 0.0.0.0\r\na=ice-ufrag:utDm\r\na=ice-pwd:L/zKPX9sHEgp5/I2DreBw8r0\r\na=ice-options:trickle\r\na=fingerprint:sha-256 F7:60:B0:31:8E:B2:2B:E9:65:BA:B3:9B:61:0F:9B:FE:C7:9E:72:E7:F2:91:DA:19:C5:31:D4:20:8C:A8:A7:F4\r\na=setup:active\r\na=mid:0\r\na=sctp-port:5000\r\na=max-message-size:262144\r\n"
    }
  },
  "type": "net.nordeck.whiteboard.connection_signaling",
  "sender": "@user-id",
  "encrypted": false
}
```

A signaling message with ICE candidates:

```json
{
  "content": {
    "sessionId": "F8hvkd6aOvo0zrd_Ao5ou",
    "connectionId": "UhuME5n36U6mRkOESYa-W_F8hvkd6aOvo0zrd_Ao5ou",
    "candidates": [
      {
        "candidate": "candidate:2213308025 1 udp 2122262783 2003:e4:1707:3600:e4f0:3fe0:be38:eff1 54544 typ host generation 0 ufrag hVWA network-id 2 network-cost 10",
        "sdpMid": "0",
        "sdpMLineIndex": 0
      },
      {
        "candidate": "candidate:3931512949 1 udp 2122194687 192.168.178.82 54380 typ host generation 0 ufrag hVWA network-id 1 network-cost 10",
        "sdpMid": "0",
        "sdpMLineIndex": 0
      }
    ]
  },
  "type": "net.nordeck.whiteboard.connection_signaling",
  "sender": "@oliver.sand.dev:synapse.dev.nordeck.systems",
  "encrypted": false
}
```

[msc3757]: https://github.com/matrix-org/matrix-spec-proposals/pull/3757/files
[todevicemessages]: https://spec.matrix.org/v1.5/client-server-api/#send-to-device-messaging
[mdnsignaling]: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling
[rtcsessiondescription]: https://developer.mozilla.org/en-US/docs/Web/API/RTCSessionDescription/toJSON
[rtcicecandidate]: https://developer.mozilla.org/en-US/docs/Web/API/RTCIceCandidate/toJSON
