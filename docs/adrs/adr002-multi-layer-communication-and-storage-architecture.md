# ADR002: Multi Layer Communication and Storage Architecture

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

The data model is an important part of the design of our whiteboard.
Taking the right turns allows us to implement a scalable widget that can be later extended with a diverse set of features.

### Data Model from a Business Perspective

For our whiteboard, we decided that the business data model consists of the following entities:

- A **room**: Contains whiteboards and widgets.
- A **widget**: Displays a single whiteboard at a time, but users can switch between which whiteboard is displayed.
- A **whiteboard**: A collection of slides that belong to each other.
- A **slide**: A canvas that the user draws multiple elements on.
- An **element**: A shape that has properties like position, color, … that is placed on a slide.

All entities are in relation to each other:

```
┌────────────────────┐
│                    │
│  Room              ├────────────┐
│                    │   1:n      │
└───┬────────────────┘            │
    │                             │
    │ 1:n                         │
    ▼                             ▼
┌────────────────────┐        ┌─────────────────────┐
│                    │        │                     │
│  Widget            ├───────►│  Whiteboard         │
│                    │ n:0..1 │                     │
└────────────────────┘        └───┬─────────────────┘
                                  │
                                  │  1:n
                                  ▼
                              ┌─────────────────────┐
                              │                     │
                              │  Slide              │
                              │                     │
                              └───┬─────────────────┘
                                  │
                                  │  1:n
                                  ▼
                              ┌─────────────────────┐
                              │                     │
                              │  Element            │
                              │                     │
                              └─────────────────────┘
```

### Challenge

The current data model, as described by [ADR001][adr001], limits us in the features we can implement.
We identified that rate limiting creates a big challenge in the current design.

The Matrix protocol enforces rate limiting for sending timeline events.
Rate limiting is used to avoid abuse like spam and to keep the utilization of the homeserver infrastructure manageable.
This means a single user might only send some messages per second (less than 10).
The exact amount of allowed messages per second may vary between homeservers and should not be relied on.
Instead, we should make sure to only send a small amount of messages.

Depending on the design of our data structure, this can be problematic.
Let’s assume that we store the state of an element in an event, meaning that every change of an element results in a message.
This might not be a problem if a user is sporadically editing a single element as he might not be able to do that many edit operations in a short time frame.
However, this becomes a problem if we implement multi-select and a user wants to move 20 elements to the left.
In that case we need to send 20 messages.
This shows that the current approach is not scaling well.

Another use case are real-time updates of the cursor position.
For the cursor position to be useful, we would have to send it multiple times per second, making room events a bad choice (also because we don’t need previous states, just the current state).

## Decision

<!-- This section describes our response to these forces. It is stated in full
sentences, with active voice. "We will ..." -->

Instead of only using Matrix rooms for communicating between the users of the whiteboard, we will introduce an architecture that has multiple layers of communication and storage:

Real-Time Communication
: To provide sub-second updates of changes or cursor positions, we establish a real-time communication connection between the active users of the whiteboard.
Data sent using this communication channel is only temporary and not stored.

Storage in Matrix rooms
: To have a long term persistence storage of the whiteboard data, we store it in a Matrix room.
This provides us the advantages of Matrix, like end-to-end encryption and access control.

Local Storage
: Data can be stored locally to handle connectivity issues and can be synced to other peers later.

```
┌──────────────────────┐                                              ┌──────────────────────┐
│                      │                                              │                      │
│      User Alice      │                                              │      User Bob        │
│                      │                                              │                      │
│  ┌────────────────┐  │                                              │   ┌───────────────┐  │
│  │                ├──┼──────────────────────────────────────────────┼──►│               │  │
│  │   WebRTC       │  │                                              │   │  WebRTC       │  │
│  │                │◄─┼──────────────────────────────────────────────┼───┤               │  │
│  └────────────────┘  │         Real-Time updates, some ms           │   └───────────────┘  │
│                      │                                              │                      │
│                      │  - Persistence (whiteboard content)          │                      │
│                      │  - Temporary (like cursors)                  │                      │
│                      │                                              │                      │
│  ┌────────────────┐  │                                              │   ┌───────────────┐  │
│  │                ├──┼──────────────────────────────────────────────┼──►│               │  │
│  │   Matrix       │  │                                              │   │  Matrix       │  │
│  │                │◄─┼──────────────────────────────────────────────┼───┤               │  │
│  └────────────────┘  │         Updates every 5-10 seconds           │   └───────────────┘  │
│                      │                                              │                      │
│                      │  - Persistence (whiteboard content)          │                      │
│                      │    stored in the room for later              │                      │
│                      │                                              │                      │
│  ┌────────────────┐  │                                              │   ┌───────────────┐  │
│  │                │  │                                              │   │               │  │
│  │   Storage      │  │                                              │   │  Storage      │  │
│  │                │  │                                              │   │               │  │
│  └─────────┬──────┘  │                                              │   └───────┬───────┘  │
│        ▲   │         │                                              │       ▲   │          │
│        │   │         │                                              │       │   │          │
└────────┼───┼─────────┘                                              └───────┼───┼──────────┘
         │   │                                                                │   │
         │   ▼                   Stored locally, immediately                  │   ▼
   ┌─────┴──────────┐                                                    ┌────┴───────────┐
   │                │     - Whiteboard content, to allow working         │                │
   │ Local Storage  │       offline, or handle users leaving the         │ Local Storage  │
   │                │       widget before data is stored in the room     │                │
   └────────────────┘                                                    └────────────────┘
```

Other real-time collaboration tools like [Element Call][elementcall], [Third Room][thirdroom], or [`matrix-CRDT`][matrixcrdt] use a similar design, that splits into Matrix based storage and a real-time communication layer using WebRTC.

## Consequences

This new design supersedes the design in [ADR001][adr001] completely.
In the following ADRs, the architecture is further refined and specified:

- [ADR003: Use CRDTs to collaborate on data](./adr003-use-crdts-to-collaborate-on-data.md)
- [ADR004: Using Yjs as a CRDT implementation](./adr004-using-yjs-as-a-crdt-implementation.md)
- [ADR005: Data structure for storing whiteboards in Matrix rooms](./adr005-data-structure-for-storing-whiteboards-in-matrix-rooms.md)
- [ADR006: WebRTC for real-time communication](./adr006-webrtc-for-real-time-communication.md)
- [ADR007: Local storage for offline capabilities](./adr007-local-storage-for-offline-capabilities.md)

<!-- This section describes the resulting context, after applying the decision.
All consequences should be listed here, not just the "positive" ones. A particular
decision may have positive, negative, and neutral consequences, but all of them
affect the team and project in the future. -->

<!-- This template is taken from a blog post by Michael Nygard
https://thinkrelevance.com/blog/2011/11/15/documenting-architecture-decisions -->

[elementcall]: https://github.com/vector-im/element-call
[thirdroom]: https://github.com/matrix-org/thirdroom
[matrixcrdt]: https://github.com/YousefED/Matrix-CRDT
[adr001]: ./adr001-whiteboard-data-format.md
