# ADR006: WebRTC for Real-Time Communication

Status: accepted

<!--
These documents have names that are short noun phrases. For example, "ADR001:
Deployment on Ruby on Rails 3.0.10" or "ADR009: LDAP for Multitenant Integration"
-->

## Context

<!--
This section describes the forces at play, including technological, political,
social, and project local. These forces are probably in tension, and should be
called out as such. The language in this section is value-neutral. It is simply
describing facts. -->

As described in [ADR002][adr002], the architecture of the whiteboard is multi layered.
One layer is the real-time communication layer, which is used to exchange real-time updates to the whiteboard, allowing for a modern way of collaboration.
The requirements for the communication layer are:

- Reliable exchange of data
- Sub-second latency
- High throughput, allowing for tens of messages per second without rate-limiting
- Has end-to-end encryption
- Works without a central server, except the existing Matrix infrastructure

## Decision

<!-- This section describes our response to these forces. It is stated in full
sentences, with active voice. "We will ..." -->

We will use [WebRTC][webrtc] to setup peer-to-peer connections between whiteboard participants as a full mesh.
Our design is similar to [MSC 3401][msc3401] that describes the basis for Element Call, however our solution is a bit simplified as our requirements differ.

```
 ┌───────────┐                                 ┌───────────┐
 │           │                                 │           │
 │   Alice   │◄───────────────────────────────►│   Bob     │
 │           │                                 │           │
 └───────────┘                                 └───────────┘
       ▲  ▲                                      ▲   ▲
       │  │                                      │   │
       │  │                                      │   │
       │  │                       ┌──────────────┘   │
       │  │                       │                  │
       │  │                       │                  │
       │  │                       │                  │
       │  └───────────────────────┼──────────────┐   │
       │                          │              │   │
       │   ┌──────────────────────┘              │   │
       │   │                                     │   │
       │   │                                     │   │
       ▼   ▼                                     ▼   ▼
 ┌───────────┐                                 ┌───────────┐
 │           │                                 │           │
 │  Charlie  │◄───────────────────────────────►│   Dave    │
 │           │                                 │           │
 └───────────┘                                 └───────────┘
                       WebRTC Full Mesh
```

To use WebRTC for the whiteboard, we have to solve two problems: discovery and signaling.

### Discovery

In the first step we have to discover the active participants of a whiteboard.
While we could assume that all room members might be participating on the whiteboard, this is not sufficient.
Instead, we need to know every instance of a whiteboard, including cases where a user has opened the same whiteboard on multiple devices or even browser tabs.

We apply a similar approach as [MSC 3401][msc3401].
A `net.nordeck.whiteboard.sessions` state event with a state key equal to the user id is used by every whiteboard participant.
Whiteboard participants use the state event to broadcast that they are currently using the whiteboard.
Each usage of the whiteboard is a _session_ that has a unique session id.
The state event contains a list of all active sessions in the room.
It is shared by different whiteboards and different whiteboard instances of the same user.
The whiteboard widget has to take care to remove old sessions that are expired when updating the event.

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

Every whiteboard participant queries and monitors the `net.nordeck.whiteboard.sessions` state events to discover active sessions.

To setup a full mesh, the whiteboard creates a peer-to-peer connection to each of these sessions (except it's own session, but including other sessions of the own user).

As there is no reliable way to remove inactive sessions, the list of active sessions might contain false-positives.
The whiteboard widget still has to try a connection attempt and ignore all failed attempts.
If the user switches to a different whiteboard in the same widget, the now inactive session should be removed.

### Signaling

To establish connections using WebRTC, it is required to perform [signaling][mdn-signaling].
During the signaling process the best way of communication between two peers is discovered, exchanged, and negotiated.
As this happens before a direct peer-to-peer connection is established, it's not directly implemented in WebRTC.
Instead, it's left as a challenge for the implementer of the application.

[MSC 2746][msc2746] already describes a signaling process for WebRTC utilized in group calls.
However, our requirements differ a bit as we don't require the call semantic.
But we still follow the same pattern and use [_to device messages_][todevicemessages] to exchange signaling messages between two sessions.
A _to device messages_ of type `net.nordeck.whiteboard.connection_signaling` is used to exchange ICE candidates and session descriptions.
The exact message content, order, and flow are not further described, but rely on the behavior of WebRTC.

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

We apply the [perfect negotiation pattern][mdn-perfect-negotiation] to establish the connection.
During the negotiation, the client with the lexicographically smaller session id is behaving as the polite peer.

ICE candidates should be batched together to avoid sending a lot of _to device messages_.

### Alternatives

There are a couple of alternatives to implementing an own WebRTC based communication layer.

#### To Device Messages

With [_to device messages_][todevicemessages], the Matrix protocol provides a built-in way of sending ephemeral messages that are not permanently stored in the Matrix room.
_To device messages_ support end-to-end encryption and can be sent using the common client SDKs, including the Widget API.
They are addressed to a user, or more specific, to individual or all devices of a user.
As _to device messages_ are not stored in the Matrix room, they are also sent independently from them.
_to device messages_ are not rate limited.

The main problem of _to device messages_ is their performance.
As it uses the same communication protocols like normal events, including federation and the sync mechanism, they have similar performance properties.
These are more in the couple of seconds, than milliseconds, making them not suitable for real-time collaboration.
In addition, while _to device messages_ are not permanent, they are still stored till all receivers have picked them up.
Therefore a big backlog of messages can pile up at the sync endpoint, even though a user might already closed the whiteboard widget.

#### MatrixRTC

Our whiteboard is not the only real-time collaboration solution based on the Matrix protocol.
Both [Element Call][elementcall] and [Third Room][thirdroom] face similar challenges.
They solved them by building a WebRTC based communication layer for _group calls_.
However, this infrastructure is not limited to _group calls_, but can also be used for other real-time communication, as Third Room has proven.
There is also planned support for alternatives to full mesh peer-to-peer connections that are still end-to-end encrypted (see [MSC 3898](msc3898)).

While there is direct support in the [`matrix-js-sdk`][matrix-js-sdk-webrtc] and there is now the [possibility to bootstrap a `matrix-js-sdk` client from the Widget API][matrix-js-sdk-embedding], there are still some limitations that are holding us back.
For example, the implementation of _group calls_ requires to know the own device id, however this information is currently not accessible to widgets.
While Element Call is implemented as a widget, too, it's [special cased in Element to receive the own device id][matrix-react-sdk-element-call-special].
In addition, clients are currently not filtering out data-only calls, and are still displaying them in the timeline.
We expect this to change in the future.

With these problems and the early state of development and specification, it's not the right choice.
However, in the long term, MatrixRTC should probably be used as a communication layer for the whiteboard.
We assume that the communication layer will be fairly easy to replace later on.

## Consequences

The detailed model for the events mentioned above is described in the [Matrix Events model][matrix-events].
In addition, we have to define the payload sent via the real-time communication channel.
This is done in the [WebRTC message model][webrtc-message-model].

The full mesh peer-to-peer design might cause performance issues.
While compared to video conferences we only send a low amount of data, handling a large amount of peer-to-peer connections might be problematic.
Implementations like MatrixRTC plan to establish cascaded connections to avoid such issues.

Handling WebRTC on our own requires a lot of knowledge of the protocol.
There might be issues with browser compatibility that are hard to track down for our team.
However, WebRTC has evolved a lot since its early days and has less compatibility issues.

Peer-to-peer connections can't always be established due to the network setup of the users.
In cases where a direct connection can not be established through a NAT, [TURN servers come into play][turn-server].
TURN servers provide a relay point between the peers.
The Widget API provides access to TURN servers configured in the homeserver.
Therefore we have to make sure that we deploy TURN servers in our environments.

Even though we didn't choose MatrixRTC as an implementation, we should closely monitor how it evolves.
At a later point we should reconsider our decision and replace our own communication layer.

<!-- This section describes the resulting context, after applying the decision.
All consequences should be listed here, not just the "positive" ones. A particular
decision may have positive, negative, and neutral consequences, but all of them
affect the team and project in the future. -->

<!-- This template is taken from a blog post by Michael Nygard
https://thinkrelevance.com/blog/2011/11/15/documenting-architecture-decisions -->

[todevicemessages]: https://spec.matrix.org/v1.5/client-server-api/#send-to-device-messaging
[elementcall]: https://github.com/vector-im/element-call
[thirdroom]: https://github.com/matrix-org/thirdroom
[msc3898]: https://github.com/matrix-org/matrix-spec-proposals/pull/3898
[matrix-js-sdk-webrtc]: https://github.com/matrix-org/matrix-js-sdk/tree/develop/src/webrtc
[matrix-js-sdk-embedding]: https://github.com/matrix-org/matrix-js-sdk/blob/develop/src/embedded.ts
[matrix-react-sdk-element-call-special]: https://github.com/matrix-org/matrix-react-sdk/blob/develop/src/models/Call.ts#L654
[adr002]: ./adr002-multi-layer-communication-and-storage-architecture.md
[webrtc]: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API
[msc3401]: https://github.com/matrix-org/matrix-spec-proposals/pull/3401
[mdn-signaling]: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling
[mdn-perfect-negotiation]: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation
[msc2746]: https://github.com/matrix-org/matrix-spec-proposals/pull/2746
[matrix-events]: ../model/matrix-events.md
[webrtc-message-model]: ../model/webrtc-messages.md
[turn-server]: https://bloggeek.me/webrtc-turn/
