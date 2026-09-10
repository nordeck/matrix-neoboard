# ADR009: MatrixRTC + LiveKit for Real Time Communication

Status: draft

## Context

This ADR supersedes and deprecates [ADR006][adr006] because of the scalability
and stability issues we encountered when using the peer-to-peer full-mesh approach.

When MatrixRTC was evaluated previously, there were a number of issues that have
since been resolved. Widgets now [have access to the user's own device id][widget-api-device-id]
and since the introduction of initial support for [MSC4143][MSC4143] in Element Web,
via the Group Calls feature, data-only calls are no longer displayed in the timeline.
The widget API also exposes the primitives a MatrixRTC application needs: the
homeserver's RTC transports ([MSC4515][MSC4515]), sticky events
([MSC4407][MSC4407]) and delayed events ([MSC4157][MSC4157]).

MatrixRTC also aims to define a set of generic event primitives that
support many types of realtime collaboration apps besides group video, by
specifying a baseline realtime session management concept, which then can be
extended to support specific application features, like ringing, answering and
rejecting a call, for video and audio calls.

With the introduction of [LiveKit][MSC4195] as a backend, Element Call was able to
provide a E2EE group call experience that can scale to hundreds of realtime participants.

## Decision

We will use MatrixRTC with a LiveKit backend ([MSC4195][MSC4195]) to provide the
realtime data exchange between NeoBoard users. This is fundamentally different
from the peer-to-peer connection mesh that was established before: a participant
connects to LiveKit backends instead of to every other participant.

A participant publishes its data to the LiveKit backend of its own homeserver,
which forwards it to everyone subscribed there, and subscribes to the backend of
every other participant to receive theirs. It therefore holds one connection per
backend in use, so connections scale with the number of distinct backends in the
session and not with the number of participants. See
[Transports and Auth](#transports-and-auth) for how backends are discovered and
connected.

We decide to keep the existing software design abstractions but include an
alternative implementation for discovery, peer connection tracking and communication
channels, with minimal impact to other whiteboard components. The MatrixRTC
implementation is activated with `REACT_APP_RTC=matrixrtc`.

### Slots

MatrixRTC represents the realtime session that participants join as a _slot_: an
application specific virtual location within a Matrix room,
represented by an `m.rtc.slot` state event (or the unstable
`org.matrix.msc4143.rtc.slot`) with a state key of the form
`net.nordeck.whiteboard#<whiteboard-id>`, an `open` status and an
`application.type` of `net.nordeck.whiteboard`.

```json
{
  "type": "org.matrix.msc4143.rtc.slot",
  "sender": "@alice:matrix.internal",
  "state_key": "net.nordeck.whiteboard#whiteboard-id",
  "content": {
    "status": "open",
    "application": {
      "type": "net.nordeck.whiteboard"
    }
  },
  "event_id": "$vRPMTLVjTaKZDCJ7-8G12Qbrf5vfHhBUV6RnaFwvzTk",
  "origin_server_ts": 1743764236021,
  "room_id": "!BWCjlIjHYWgJyZySxE:matrix.internal"
}
```

The whiteboard itself is still pointed to by the `net.nordeck.whiteboard` state
event and the document data is still stored as described in [ADR005][adr005];
the slot only covers the realtime session.

### Discovery

Discovery is about finding the active participants of a whiteboard. Instead of
the `net.nordeck.whiteboard.sessions` state event with the user's MXID as the
`state_key`, participation is expressed with `m.rtc.member` (or the unstable
`org.matrix.msc4143.rtc.member`) events that reference the slot through their
`slot_id`.

These are **not** state events. They are sticky room events as defined by
[MSC4354][MSC4354]: a room event that the homeserver keeps in the sync response
for a bounded duration and that is addressed by a `msc4354_sticky_key` instead
of a state key. Membership therefore does not overwrite shared state and every
join can be tracked individually.

```json
{
  "type": "org.matrix.msc4143.rtc.member",
  "sender": "@alice:matrix.internal",
  "content": {
    "slot_id": "net.nordeck.whiteboard#whiteboard-id",
    "member": {
      "id": "V1StGXR8_Z5jdHi6B-myT",
      "membership": "join",
      "device_id": "SDXDZRNDJA"
    },
    "application": {
      "type": "net.nordeck.whiteboard",
      "whiteboard_id": "whiteboard-id"
    },
    "transports": {
      "published": [
        {
          "type": "m.livekit",
          "livekit_service_url": "https://livekit-jwt.matrix.internal"
        }
      ],
      "can_subscribe": ["m.livekit"]
    },
    "msc4354_sticky_key": "V1StGXR8_Z5jdHi6B-myT"
  },
  "origin_server_ts": 1743764236021,
  "event_id": "$bFsA4Obl-sneiJlq4SAM2WGMLe00ie3f-Mod7VQfF_c",
  "room_id": "!BWCjlIjHYWgJyZySxE:matrix.internal"
}
```

A `member.id` is generated fresh on every join, so the same user can collaborate
on the same whiteboard from several devices. The sticky key equals the member id,
which makes a later event for the same member supersede the earlier one.

`MatrixRtcSessionManagerImpl` observes the member events of the room and keeps
only those that are currently sticky and whose `slot_id` matches the joined
whiteboard.

A `leave` event for a member id invalidates a `join` for the same
member id.

Membership is refreshed by re-sending the join event at 90% of the sticky
duration (one hour), which keeps the session alive for as long as the widget is
open.

#### Session identity

A session is identified by a pseudonymous participant identity, computed as the
unpadded base64 encoding of the SHA-256 hash of the JSON serialization of
`[user_id, device_id, member_id]` (`matrixRtcParticipantIdentity`). The same
value is used as the LiveKit participant identity, which lets the widget map
incoming data packets back to a Matrix user through the discovered memberships,
without exposing MXIDs or device ids to the SFU.

Active whiteboard members shown in the UI are the intersection of the LiveKit
remote participant identities and the memberships known from the room, so
presence follows the realtime connection instead of an event's expiry
timestamp.

Check the [MatrixRTC model docs][matrix-rtc-events] for additional details on
both events.

### Signaling

Thanks to the LiveKit [Client JS SDK][livekit-js-sdk], we don't have to handle
establishing WebRTC peer connections to every participant. This is now done by
the SDK itself, abstracted away by having a [server-side room][livekit-room] to
which each participant connects to.

`MatrixRtcPeerConnection` wraps one LiveKit `Room` and is identified by the
LiveKit service URL it was created for. Statistics are collected from both
underlying peer connections (publisher and subscriber) of that room.

### Message Reliability

LiveKit data packets are lossy by default. Messages whose loss cannot be
repaired by a later message are published reliably (`reliable: true`):
`net.nordeck.whiteboard.present_slide`, `net.nordeck.whiteboard.present_frame`
and `net.nordeck.whiteboard.focus_on`. CRDT updates and
`net.nordeck.whiteboard.cursor_update` stay unreliable, as the former are
converged by the CRDT and by the room snapshots and the latter are superseded by
the next cursor position.

### Transports and Auth

As different participants join a whiteboard realtime collaboration session from
different homeservers, it is important that the client can establish the
connection to the right backend. The available backends are advertised by the
homeserver as MatrixRTC transports and requested from the client through the
widget API ([MSC4515][MSC4515]) with `getRtcTransports()`. The widget publishes
them in the `transports.published` list of its own membership event and declares
`can_subscribe: ["m.livekit"]`, as LiveKit is the only transport it can use.
Transport discovery is therefore fully delegated to the homeserver.

Access to the LiveKit backend's resources requires a JWT token, obtained by first
getting an OpenID access token from the user's homeserver and then providing it to
the [LiveKit JWT service][livekit-jwt] of the transport, together with the room
id, the slot id and the claimed member:

```json
{
  "room_id": "!BWCjlIjHYWgJyZySxE:matrix.internal",
  "slot_id": "net.nordeck.whiteboard#whiteboard-id",
  "openid_token": { "...": "..." },
  "member": {
    "id": "V1StGXR8_Z5jdHi6B-myT",
    "claimed_user_id": "@alice:matrix.internal",
    "claimed_device_id": "SDXDZRNDJA"
  }
}
```

If the token is valid, the JWT service replies with a secure web socket endpoint
for the LiveKit backend and a JWT token, both of which are then used to establish
the realtime data channels.

A participant publishes to the SFU of its own homeserver. When a session from
another homeserver joins, the widget additionally opens a connection to the SFU
published by that session, so it receives the data that is published there.
Broadcasts are sent on the connection to the own SFU only, and there is at most
one connection per LiveKit service URL.

### Session Termination

We use [delayed events][MSC4140] with a few seconds refresh while the widget is
active, so that when it becomes inactive, a "hangup" is applied in the room. The
delayed event is a member event with a `leave` membership and a
`leave_reason.code` of `delayed_leave`; it is restarted at 75% of its delay
through the widget API ([MSC4157][MSC4157]) and re-armed whenever the sticky join
event is renewed.

Leaving intentionally sends a `leave` member event with a `leave_reason.code` of
`leave` and cancels the pending delayed event. This also happens when the widget
is hidden for longer than the visibility timeout, in which case the widget leaves
the session and closes its SFU connections, and re-joins once it becomes visible
again.

## Consequences

### Deployment

Two new backend services are required: the LiveKit Server and the LiveKit Authorisation
Service. The homeserver also has to advertise the LiveKit transport and to
support delayed events, MatrixRTC and sticky events, and the client hosting the
widget has to implement the corresponding widget API actions. This increases the complexity
of deploying the widget but as these components are also a requirement for
Element Call, we are positive that they will become a standard and will be
available on most Matrix deployments.

### Unstable prefixes and ongoing spec proposal process

Event types and capabilities all use unstable prefixes, as the underlying MSCs
are not yet merged. Both the widget and the homeserver/client have to move
together whenever the proposals change.

As of September 2026, all of the proposals this implementation depends on are
still ongoing active discussion, so we expect further changes down the road, and
we will keep this ADR up to date when they come.

### Multiple RTC apps

Slots namespace the realtime sessions per application, since the slot's state
key contains the application identifier and every member event references its
slot through `slot_id`. Several MatrixRTC applications can therefore be used in
the same room at the same time, and since membership is a sticky room event keyed
by a per-join member id, they do not compete for a shared membership state event.

A widget with the receive capability, however, sees all
`m.rtc.member` events of the room, including the metadata of other applications'
sessions, and exposes its own metadata to them in the same way.

### Relevant MSCs

- [MSC3898: Native Matrix VoIP signalling for cascaded SFUs][MSC3898]
- [MSC4143: MatrixRTC][MSC4143]
- [MSC4140: Cancellable delayed events][MSC4140]
- [MSC4157: Widget API for delayed events][MSC4157]
- [MSC4195: MatrixRTC using LiveKit backend][MSC4195]
- [MSC4196: MatrixRTC voice and video conferencing application m.call][MSC4196]
- [MSC4354: Sticky events][MSC4354]
- [MSC4407: Widget API for sticky events][MSC4407]
- [MSC4515: Widget API for RTC transports][MSC4515]

also related:

- [MSC2746: Improved Signalling for 1:1 VoIP][MSC2746]
- [MSC3401: Native Group VoIP Signalling][MSC3401]
- [MSC3419: Guest State Events][MSC3419]
- [MSC3757: Restricting who can overwrite a state event][MSC3757]

<!-- references -->

[adr005]: ./adr005-data-structure-for-storing-whiteboards-in-matrix-rooms.md
[adr006]: ./adr006-webrtc-for-real-time-communication.md
[widget-api-device-id]: https://github.com/matrix-org/matrix-widget-api/commit/bd744d9bf6872d654334e0e70ef7e7f31791adb0
[MSC4143]: https://github.com/matrix-org/matrix-spec-proposals/blob/toger5/matrixRTC/proposals/4143-matrix-rtc.md
[MSC3898]: https://github.com/matrix-org/matrix-spec-proposals/blob/SimonBrandner/msc/sfu/proposals/3898-sfu.md
[MSC4140]: https://github.com/matrix-org/matrix-spec-proposals/blob/toger5/expiring-events-keep-alive/proposals/4140-delayed-events-futures.md
[MSC4157]: https://github.com/matrix-org/matrix-spec-proposals/pull/4157
[MSC4195]: https://github.com/hughns/matrix-spec-proposals/blob/hughns/matrixrtc-livekit/proposals/4195-matrixrtc-livekit.md
[MSC4196]: https://github.com/matrix-org/matrix-spec-proposals/blob/hughns/matrixrtc-m-call/proposals/4196-matrixrtc-m-call.md
[MSC4354]: https://github.com/matrix-org/matrix-spec-proposals/blob/kegan/persist-edu/proposals/4354-sticky-events.md
[MSC4407]: https://github.com/matrix-org/matrix-spec-proposals/pull/4407
[MSC4515]: https://github.com/matrix-org/matrix-spec-proposals/pull/4515
[MSC2746]: https://github.com/matrix-org/matrix-spec-proposals/blob/dbkr/msc2746/proposals/2746-reliable-voip.md
[MSC3401]: https://github.com/matrix-org/matrix-spec-proposals/blob/matthew/group-voip/proposals/3401-group-voip.md
[MSC3419]: https://github.com/matrix-org/matrix-spec-proposals/blob/matthew/guest-state-events/proposals/3419-guest-state-events.md
[MSC3757]: https://github.com/matrix-org/matrix-spec-proposals/blob/andybalaam/owner-state-events/proposals/3757-restricting-who-can-overwrite-a-state-event.md
[livekit-js-sdk]: https://github.com/livekit/client-sdk-js
[livekit-room]: https://docs.livekit.io/home/client/connect/#connecting-to-a-room
[livekit-jwt]: https://github.com/element-hq/lk-jwt-service
[matrix-rtc-events]: ../model/matrix-rtc-events.md
