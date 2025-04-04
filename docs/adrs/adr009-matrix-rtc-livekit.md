# ADR009: MatrixRTC + LiveKit for Real Time Communication

Status: draft

## Context

This ADR supercedes and deprecates [ADR006][adr006] because of the scalability and stability issues we encountered when using the peer-to-peer full-mesh approach.

When MatrixRTC was evaluated previously, there were a number of issues that have since been resolved. Widgets now [have access to the user's own device id](widget-api-device-id) and since the introduction of initial support for [MSC4143](MSC4143) in Element Web, via the Group Calls feature, data-only calls are no longer displayed in the timeline.

Matrix RTC also aims to define a set of generic state event primitives that support many types of realtime collaboration apps besides group video, by specificying a baseline realtime session management concept, which then can be extended to support specific application features, like ringing, answering and rejecting a call, for video and audio calls.

With the introduction of [LiveKit](MSC4145) as a backend for [cascading SFUs](MSC3898), Element Call was able to provide a E2EE group call experience that can scale to hundreds of realtime participants.

## Decision

We will use Matrix RTC with a LiveKit backend to provide the realtime data exchange between NeoBoard users. This is fundamentally different from the peer-to-peer connection mesh that was established before. Now, each whiteboard participant will only establish two WebRTC data channels to the LiveKit backend, one for publishing data, the other for receiving data.

Data is forwarded to the LiveKit backend and then routed by the backend to the other participants. We do not use media streams, only data channels within the context of a Livekit room.

We decide to keep the existing software design abstractions but include an alternative implementation for discovery, peer connection tracking and communication channels, with minimal impact to other whiteboard components.

### Discovery

Discovery is about finding the active participants of a whiteboard. In Matrix RTC this becomes simpler, as for each combination of user and device, there is a [RTC membership state event](rtc-member) with the participant's metadata.

Instead of the `net.nordeck.whiteboard.sessions` state event with the user's MXID as the `state_key`, we keep track of realtime session memberships via the `m.rtc.member` (or the unstable `org.matrix.msc3401.call.member`), with a `state_key` that matches the following format: `_{mxid}_{deviceid}`, which allows for the same participant to collaborate in the same whiteboard from multiple devices.

```json
{
  "type": "org.matrix.msc3401.call.member",
  "sender": "@alice:matrix.internal",
  "content": {
    "application": "net.nordeck.whiteboard",
    "call_id": "$a3pqYnak-jP54Mi69BP1YW4PtA70842U-GjFMg4XTtY",
    "device_id": "SDXDZRNDJA",
    "focus_active": {
      "type": "livekit",
      "livekit_service_url": "https//livekit-jwt.matrix.internal"
    },
    "foci_preferred": [
      {
        "type": "livekit",
        "livekit_service_url": "https//livekit-jwt.matrix.internal"
      }
    ],
    "created_ts": 1743764236004,
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

This state event is kept in sync with the realtime LiveKit connection status, having it's `content` cleared when that realtime connection is lost (either intentionally or not).

### Signaling

Thanks to the LiveKit [Client JS SDK][livekit-js-sdk], we don't have to handle estabilishing WebRTC peer connections to every participant. This is now done by the SDK itself, abstracted away by having a [server-side room](livekit-room) to which each participant connects to. There is still a WebRTC negotiation process that establishes the two data connections to the LiveKit backend but that is completely opaque and we only have to monitor a single connection status.

### Foci Discovery and Auth

As different participants join a whiteboard realtime collaboration session from different homeservers, it is important that the client can establish the connection to the right backend. The oldest session member gets the URL for his homeserver LiveKit backend(s) from `/.well-known/matrix/client` and shares it in the RTC session membership state event. Active session members should monitor the oldest membership and keep an ordered list of the possible foci to use, by concatenating the current focus in use in addition to their own homeserver list. Group membership changes should have clients adjust their focus accordingly.

Access to the LiveKit backend's resources requires a JWT token, obtained by first getting an OpenID access token from user's homeserver and then providing it to the [LiveKit JWT service](livekit-jwt). If the access token is valid, the JWT service replies with a secure web socket endpoint for the livekit backend and a JWT token, both of which are then used to establish the realtime data channels.

### Session Termination

We use [delayed events](MSC4140) with a 5 second refresh while the widget is active, so that when it becomes inactive, a "hangup" event is applied in the room, by clearing the `content` of the RTC membership state event of that client and effectively terminating his session.

## Consequences

### Deployment

Two new backend services are required: the LiveKit Server and the LiveKit JWT Service. This increases the complexity of deploying the widget but as these components are also a requirement for Element Call, we are positive that they will become a standard and will be available on most Matrix deployments.

### Multiple active RTC apps

The currently proposed specification allows for having RTC membership state events for different applications, by using the `application` property. For example, this is `m.call` for Element Call and `net.nordeck.whiteboard` for NeoBoard.

This is fine if you are using a single RTC app within a matrix room but there is currently no specification of the expected behaviour if a user adds more than one MatrixRTC-based application to the same room and tries to use them at the same time. They will be racing to update the same membership state event, which is obviosuly not desirable.

### Relevant MSCs

- [MSC3898: Native Matrix VoIP signalling for cascaded SFUs](MSC3898)
- [MSC4143: MatrixRTC](MSC4143)
- [MSC4140: Cancellable delayed events](MSC4140)
- [MSC4195: MatrixRTC using LiveKit backend](MSC4145)
- [MSC4196: MatrixRTC voice and video conferencing application m.call](MSC4196)

also related:

- [MSC2746: Improved Signalling for 1:1 VoIP](MSC2746)
- [MSC3401: Native Group VoIP Signalling](MSC3401)
- [MSC3419: Guest State Events](MSC3419)
- [MSC3757: Restricting who can overwrite a state event](MSC3757)

<!-- references -->

[adr006]: ./adr006-webrtc-for-real-time-communication.md
[widget-api-device-id]: https://github.com/matrix-org/matrix-widget-api/commit/bd744d9bf6872d654334e0e70ef7e7f31791adb0
[MSC4143]: https://github.com/matrix-org/matrix-spec-proposals/blob/toger5/matrixRTC/proposals/4143-matrix-rtc.md
[MSC3898]: https://github.com/matrix-org/matrix-spec-proposals/blob/SimonBrandner/msc/sfu/proposals/3898-sfu.md
[MSC4140]: https://github.com/matrix-org/matrix-spec-proposals/blob/toger5/expiring-events-keep-alive/proposals/4140-delayed-events-futures.md
[MSC4145]: https://github.com/hughns/matrix-spec-proposals/blob/hughns/matrixrtc-livekit/proposals/4195-matrixrtc-livekit.md
[MSC4196]: https://github.com/matrix-org/matrix-spec-proposals/blob/hughns/matrixrtc-m-call/proposals/4196-matrixrtc-m-call.md
[MSC2746]: https://github.com/matrix-org/matrix-spec-proposals/blob/dbkr/msc2746/proposals/2746-reliable-voip.md
[MSC3401]: https://github.com/matrix-org/matrix-spec-proposals/blob/matthew/group-voip/proposals/3401-group-voip.md
[MSC3419]: https://github.com/matrix-org/matrix-spec-proposals/blob/matthew/guest-state-events/proposals/3419-guest-state-events.md
[MSC3757]: https://github.com/matrix-org/matrix-spec-proposals/blob/andybalaam/owner-state-events/proposals/3757-restricting-who-can-overwrite-a-state-event.md
[livekit-js-sdk]: https://github.com/livekit/client-sdk-js
[livekit-room]: https://docs.livekit.io/home/client/connect/#connecting-to-a-room
[livekit-jwt]: https://github.com/element-hq/lk-jwt-service
[rtc-member]: https://github.com/matrix-org/matrix-js-sdk/blob/d6ede767c929f7be179d456b5a0433be21ccaf7c/src/matrixrtc/CallMembership.ts#L35
