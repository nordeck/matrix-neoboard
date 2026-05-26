# ADR005: Data Structure for Storing Whiteboards in Matrix Rooms

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

As described in [ADR002][adr002], the architecture of the whiteboard is multi-layered.
One layer is the persistent storage layer, which is used to store the whiteboard into the room for long-term storage.
The requirements for the persistent layer are:

- Be able to store byte data (raw data streams—no JSON)
- Supports large (>1MB) whiteboards
- Efficient event retrieval from the room
- Works without a central server, except the existing Matrix infrastructure
- Has end-to-end encryption

## Decision

<!-- This section describes our response to these forces. It is stated in full
sentences, with active voice. "We will ..." -->

Main decisions:

1. We use room events to store all data because they support end-to-end encryption and allow us to have individually addressable snapshots (in contrast to state event history).
2. We use [“Event Relationships”][msc2674-relationships] to efficiently and reliably access all relevant room events.
3. We support chunking to be able to support whiteboards that exceed the [size limit of 64kb][matrix-size-limits] of a single Matrix event.

### Chunking

Matrix events have a maximum size of [64kb][matrix-size-limits], including any metadata that is added during federation (like headers, trailers, or signatures).
End-to-encryption encodes the complete event with base64 and further reduces the [available payload][matrix-size-limits-encrypted].
We will split the input stream into 34kb blocks and encode the data using base64 (~33% overhead; 34kb payload -> ~45kb string -> ~60kb encrypted + ~4kb for the Matrix overhead < 64kb max event size).
This leaves us a safety margin of around 4kb for any additional overhead that is added by the Matrix protocol.

### Room events

We store three kinds of events in a room:

`net.nordeck.whiteboard.document.create`
: Creates a new document. The `event_id` of the event represents the ID of the document that is stored in the `net.nordeck.whiteboard` event.

`net.nordeck.whiteboard.document.snapshot`
: Creates a new document snapshot. Relates to the “create” event. The newest valid snapshot defines the latest document content.

`net.nordeck.whiteboard.document.chunk`
: Create a new document snapshot chunk. Relates to the “snapshot” event. Each snapshot has `[1..n]` chunks that can be concatenated to form the complete data.

Each whiteboard in a room is defined in a state event:

`net.nordeck.whiteboard`
: Create a new whiteboard. The `state_key` is the whiteboard id. References a “document create“ event in the `documentId` that represents the content.

```
┌────────────────────────────────────────┐
│                                        │
│ net.nordeck.whiteboard                 │
│ (state_key: <whiteboard-id>)           │
│                                        │
└──┬─────────────────────────────────────┘
   │
   │ content.documentId
   │
   ▼
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
x     │   │ content.sequenceId: 0                 │  x      x
x     │   │ content.data: hW9Kg69...              │  x      x
x     │   │                                       │  x      x
x     │   └───────────────────────────────────────┘  x      x
x     │                                              x      x
x     │   ┌───────────────────────────────────────┐  x      x
x     │   │                                       │  x      x
x     │   │ net.nordeck.whiteboard.document.chunk │  x      x
x     ├───┤ content.documentId: documentId        │  x      x
x     │   │ content.sequenceId: 1                 │  x      x
x     .   │ content.data: hW9Kg/l...              │  x      x
x     .   │                                       │  x      x
x     .   └───────────────────────────────────────┘  x      x
x                                                    x      x
x                                                    x      x
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx      xxxxxxxxxxxxxx...
```

The complete data model is defined in [“Events Data Model”][model-events].

### Alternative: Overflow chunking

Instead of using a “snapshot” that has “chunks”, we could store the data directly in the snapshot and only create additional “chunks” if the data becomes too large.
This would reduce the amount of needed calls to the [`/relations` endpoint][msc2675-relation-server-aggregation] if the data fits into a single chunk.
However, due to the design of the [CRDT model][model-crdt], we expect that most whiteboards will quickly exceed the 45kb limit.

```
      .                                                           .
      .                                                           .
      .                                                           .
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx      xxxxxxxxxxxxxx...
x     │                                              x      x     │
x  ┌──┴────────────────────────────────────┐         x      x  ┌──┴───────...
x  │                                       │         x      x  │
x  │ net.nordeck.whiteboard.document.chunk │         x      x  │ net.norde...
x  │ event_id ≙ snapshotId                 │         x      x  │ ...
x  │ content.chunkCount: N                 │         x      x  │ ...
x  │ content.data: hW9Kg69...              │         x      x  │ ...
x  │                                       │         x      x  │
x  └───────────────────────────────────────┘         x      x  └──────────...
x     ▲                                              x      x     ▲
x     │                                              x      x     │
x     │ m.relates_to: m.reference <snapshotId>       x      x     │
x     │                                              x      x     .
x     │   ┌───────────────────────────────────────┐  x      x     .
x     │   │                                       │  x      x     .
x     │   │ net.nordeck.whiteboard.document.chunk │  x      x
x     ├───┤ content.documentId: documentId        │  x      x
x     │   │ content.sequenceNumber: 1             │  x      x
x     .   │ content.data: hW9Kg/l...              │  x      x
x     .   │                                       │  x      x
x     .   └───────────────────────────────────────┘  x      x
x                                                    x      x
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx      xxxxxxxxxxxxxx...
```

We think that is better to have a clearer distinction between the existence of a “snapshot” and the saved data (see also [Alternative: Content Repository](#alternative-content-repository)).
Thus, we prefer to have “snapshots” and “chunks”.

### Alternative: Content Repository

Instead of storing the data in room events, we could upload the whiteboard CRDT to the [Matrix content repository][matrix-content-repository].
This would have the advantage that it doesn't bloat the room storage with large room events.
We would only have snapshot events that would link to one or more `mxc://<server-name>/<media-id>` entries (servers apply content size limitations so we still might need to chunk the data).
We would also need to support [encrypted attachments][matrix-encrypted-attachments].

```
      .                                                           .
      .                                                           .
      .                                                           .
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx      xxxxxxxxxxxxxx...
x     │                                              x      x     │
x     │       "Encoded Whiteboard CRDT"              x      x     │
x     │                                              x      x     │
x  ┌──┴───────────────────────────────────────┐      x      x  ┌──┴───────...
x  │                                          │      x      x  │
x  │ net.nordeck.whiteboard.document.snapshot │      x      x  │ net.norde...
x  │ event_id ≙ snapshotId                    │      x      x  │ ...
x  │                                          │      x      x  │
x  └──┬───────────────────────────────────────┘      x      x  └──┬───────...
x     │                                              x      x     │
x     │ chunks[]                                     x      x     │
x     │                                              x      x     .
x     │   ┌───────────────────────────────────────┐  x      x     .
x     │   │                                       │  x      x     .
x     │   │ mxc://server.matrix/jcbeuqia          │  x      x
x     ├──►│ <data: hW9Kg69...>                    │  x      x
x     │   │                                       │  x      x
x     │   └───────────────────────────────────────┘  x      x
x     │                                              x      x
x     │   ┌───────────────────────────────────────┐  x      x
x     │   │                                       │  x      x
x     │   │ mxc://server.matrix/hwubwhru          │  x      x
x     └──►│ <data. nhW9Kg/l...>                   │  x      x
x     .   │                                       │  x      x
x     .   └───────────────────────────────────────┘  x      x
x     .                                              x      x
x                                                    x      x
x                                                    x      x
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx      xxxxxxxxxxxxxx...
```

This is a preferable solution, however, the Widget API currently lacks support for accessing content repositories (see [vector-im/element-web#19435](https://github.com/vector-im/element-web/issues/19435)).
If this changes, we might switch to storing snapshots in the content repository.
This could be implemented in a forward-compatible implementation by using:

1. “chunk” events if the `chunkCount` is defined in the snapshot.
2. the content repository if `chunks` is defined in the snapshot.

### Alternative: Existing solutions

There are a number of existing implementations of CRDTs that also support Matrix as a storage solution.
These include [Collabs](https://collabs.readthedocs.io) or [Matrix CRDT](https://github.com/YousefED/Matrix-CRDT).
Collabs would also already support the `matrix-widget-api`.
However, we discourage their use since they have some downsides:

- Limited flexibility in the choice of the CRDT implementation (Collabs uses an own implementation; Matrix CRDT uses Yjs).
- Lack of chunking for large documents.
- Either based on the `matrix-js-sdk` (Matrix CRDT) or don't focus on the reliability aspect with relations (Collabs).

## Consequences

### Create documents

1. Create a `net.nordeck.whiteboard.document.create` event (the `event_id` is the `documentId`).
2. For each new snapshot:
   1. Create a `net.nordeck.whiteboard.document.snapshot` event.
   2. Create all required `net.nordeck.whiteboard.document.chunk` events.

### Read documents

1. Read all snapshots that relate to the `documentId` ordered newest-first.
2. Select the next snapshot.  
   If no snapshot exists, return `undefined`.
3. Read all chunks that relate to the snapshot.
4. Check if all chunks are read (`[snapshot].content.chunkCount === |[chunk]|`).  
   If not, go to **2.**
5. Concatenate the chunks in the correct order and check if the data is valid (i.e. can be parsed by the CRDT library and fits the [expected schema][model-crdt]).  
   If valid, return data.  
   If invalid, go to **2.**

### Rate limiting

Each snapshot can contain a large number of chunks (`1MB / 45kb = 23 chunks`).
Most homeservers are rate-limited so we must take this into account.
We will make sure to not send more than 3 messages per second.
This will result in a total save-duration for the `1MB` example to be `~8` seconds.
We will accept this limitation for now, but would prefer to use the [Content Repository](#alternative-content-repository) in the future to overcome this issue.

<!-- This section describes the resulting context, after applying the decision.
All consequences should be listed here, not just the "positive" ones. A particular
decision may have positive, negative, and neutral consequences, but all of them
affect the team and project in the future. -->

<!-- This template is taken from a blog post by Michael Nygard
https://thinkrelevance.com/blog/2011/11/15/documenting-architecture-decisions -->

[adr002]: ./adr002-multi-layer-communication-and-storage-architecture.md
[adr004]: ./adr004-using-yjs-as-a-crdt-implementation.md
[model-crdt]: ../model/crdt-documents.md
[model-events]: ../model/matrix-events.md
[matrix-content-repository]: https://spec.matrix.org/v1.5/client-server-api/#content-repository
[matrix-encrypted-attachments]: https://spec.matrix.org/v1.5/client-server-api/#sending-encrypted-attachments
[matrix-size-limits]: https://spec.matrix.org/v1.5/client-server-api/#size-limits
[matrix-size-limits-encrypted]: https://github.com/matrix-org/matrix-js-sdk/blob/7b10fa367df357b51c2e78e220d39e5e7967f9e3/src/crypto/OlmDevice.ts#L27-L29
[msc2674-relationships]: https://github.com/matrix-org/matrix-spec-proposals/pull/2674
[msc2675-relation-server-aggregation]: https://github.com/matrix-org/matrix-spec-proposals/pull/2675
