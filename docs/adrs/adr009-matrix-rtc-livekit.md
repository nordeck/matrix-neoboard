# ADR009: MatrixRTC + LiveKit for Real Time Communications

Status: draft

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

This ADR supercedes and deprecates [ADR006][adr006] because of the scalability and stability issues we encountered when using the previous full-mesh approach.

### Relevant MSCs

- MSC3898: Native Matrix VoIP signalling for cascaded SFUs - https://github.com/matrix-org/matrix-spec-proposals/blob/SimonBrandner/msc/sfu/proposals/3898-sfu.md
- MSC4143: MatrixRTC - https://github.com/matrix-org/matrix-spec-proposals/blob/toger5/matrixRTC/proposals/4143-matrix-rtc.md
- MSC4140: Cancellable delayed events - https://github.com/matrix-org/matrix-spec-proposals/blob/toger5/expiring-events-keep-alive/proposals/4140-delayed-events-futures.md
- MSC4196: MatrixRTC voice and video conferencing application m.call - https://github.com/matrix-org/matrix-spec-proposals/blob/hughns/matrixrtc-m-call/proposals/4196-matrixrtc-m-call.md

also related:

- MSC2746: Improved Signalling for 1:1 VoIP - https://github.com/matrix-org/matrix-spec-proposals/blob/dbkr/msc2746/proposals/2746-reliable-voip.md
- MSC3401: Native Group VoIP Signalling - https://github.com/matrix-org/matrix-spec-proposals/blob/matthew/group-voip/proposals/3401-group-voip.md
- MSC3419: Guest State Events - https://github.com/matrix-org/matrix-spec-proposals/blob/matthew/guest-state-events/proposals/3419-guest-state-events.md
- MSC3757: Restricting who can overwrite a state event - https://github.com/matrix-org/matrix-spec-proposals/blob/andybalaam/owner-state-events/proposals/3757-restricting-who-can-overwrite-a-state-event.md

The road to a working MatrixRTC + LikeKit requires:

- setup livekit + jwt service

  - setup .well-known/matrix/client, if available, over the configured SFU

- there seems to be an issue in the example rtc with power levels

  - normal users don't establish the data connection
  - only after moving them to mod status

- Replace the discovery of participants from the custom sessions to using `m.call.member` MatrixRTC events

  - How does this effect the Element Call UI? the call button is active!
  - Non-call semantics have yet to be introduced in the events, so Element will display ongoing RTC sessions as a video call in the UI
  - Can we contribute with these changes?

- How can one use multiple rtc sessions for different apps in the rame room?

  - do they all fall under the same `m.rtc.member` room state event?

- to take advantage of the MatrixRTCSession implemented in JS SDK, we need to:

  - expose a matrioshka client in the widget toolkit
    - this can be made by creating a new @matrix-widget-toolkit/matrixrtc package
    - it relies on the existing widget api promise
  - implement a turn-server type polling but for auto-discovery of services via well-known
  - required types:
    - MatrixRTCSessionEvent
    - CallMembership
    - MatrixRTCSession
    - MatrixClient (matrioshka)

- Migrate the signaling from to-device messages to room events (see MSCXXX)

- Replace WebRTC data channels with LiveKit data channels
  - should be straight forward

## TODO

[X] NEO-1249: Update Matrix Widget Toolkit to expose DeviceID

[-] NEO-1250: Update docker compose dev env to include LiveKit + LiveKit JWT Service

[ ] Update widget capabilities and permissions

[ ] Have a finished ADR009

[ ] Do we still need statistics? Maybe livekit gives us that?
