# ADR004: Using Yjs as a CRDT implementation

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

[ADR003][adr003] describes how [Conflict-free Replicated Data Types (CRDT)][crdttech] can be used to implement conflict free collaborative editing.
As we don't want to implement an own CRDT, we want to choose an existing library.
The data structure we use for our business data needs to be adjusted to the features of the selected library.

### Available Implementations

There are several JavaScript implementations for CRDTs available.
[crdt.tech][crdttech] provides a good collection of libraries.
We further only compare the most influential libraries (e.g. based on GitHub stars and NPM downloads), that are well maintained and have an active user base.

#### Automerge

[Automerge][automerge] is a CRDT library that is [implemented in Rust][automerge-rs] but provides a JavaScript binding to the WASM binaries.
Compared to other libraries, Automerge focuses only on CRDTs and being fully agnostic to storage and data exchange.
It supports working directly with JSON like data structures which is neat as TypeScript typings can be used directly.
The full history of changes, including author, is stored, which makes it possible to restore previous versions of the data.
Automerge uses efficient binary formats for storing data and updates.
The library is under active development and provides an extensive documentation.

#### Yjs

[Yjs][yjs] is a CRDT framework that is especially designed for implementing collaborative text editors, but also provides general purpose data structures.
The community provides a range of bindings for existing text editor components, as well as bindings for communication layers and storage.
For example, there is a [communication layer using Matrix][matrix-crdt].
Matrix CRDT has a communication layer with a similar design as described in [ADR002][adr002], which uses Matrix for snapshots and updates, with an additional experimental WebRTC real-time layer.
Yjs uses custom maps and arrays which makes typing and validating data more difficult.
Compared to Automerge, Yjs doesn't store the full history of the data.
Instead, deleted fields are removed from the snapshots.
The framework is under active maintenance.

#### GUN

[GUN][gun] is a decentralized, real-time, offline-first, graph database.
It is a full platform, designed to work without a central authority.
While it has exchangeable layers, it brings implementations for storage, communication, and security.
The framework is under active development.

### Others

One notable mention is [collabs](https://github.com/composablesys/collabs), a library for building collaborative applications on top of Matrix.
In general it solves similar problems as our architecture, but the community around the project is rather small and maintenance infrequent.

#### Comparison

In the following table we compare the three previous mentioned libraries:

|                            | Automerge                   | Yjs                                                                      | Gun                        |
| -------------------------- | --------------------------- | ------------------------------------------------------------------------ | -------------------------- |
| Focus                      | JSON like storage           | Text editing                                                             | Decentralized data storage |
| Data Types                 | Map, List, Text, Counter    | Map, List, Text, XML                                                     | Map / Graph relations      |
| Storage Format             | Compact Binary Format       | Compact Binary Format                                                    | ?                          |
| Update Format              | Compact Binary Format       | Compact Binary Format                                                    | ?                          |
| Removing unreferenced data | Keeps full history          | Supports garbage collection                                              | ?                          |
| Access History             | Keeps full history          | No history access                                                        | ?                          |
| GitHub stars               | 1k / 14k (old package)      | 10k                                                                      | 16k                        |
| NPM weekly downloads       | 349 / 3761 (old package)    | 190828                                                                   | 2470                       |
| TypeScript typings         | Yes, including user data    | Yes, but user data is not typed                                          | Yes                        |
| Installation               | Requires WASM configuration | -                                                                        | -                          |
| Additional Notes           | Minimalistic, uses WASM     | Relative Positions for text editing, community with text editor bindings | Security and authorization |

The comparisons exclude performance benchmarks.
While there are benchmarks available that compare Automerge and Yjs, they aren't meaningful for us because they compare different use-cases.
The author of Yjs created [a suite of detailed benchmarks][crdt-benchmarks] that cover a lot of features.
However, the benchmarks compare a recent version of Yjs with an old version of Automerge, which has transitioned to a completely new implementation twice.
An author of Automerge created a [smaller comparison between Yjs and Automerge][automerge-perf-comparisons] with more recent versions.
But this benchmark is very limited and not transparent.
In general, we didn't notice that the performance of the CRDT implementation is an important factor during our prototype.
For our scenario, the storage size is more of a concern.
If benchmarks are performed, they should be based on our usage pattern and data model.

## Decision

<!-- This section describes our response to these forces. It is stated in full
sentences, with active voice. "We will ..." -->

We will use [Yjs][yjs] as our CRDT implementation of choice.
The key to this choice is that Yjs only stores data that is still referenced.
This ensures that the documents remain a reasonable size, even if users make a lot of changes.
If we want to implement access to the whiteboard history, we still have access to the snapshots stored in the room.
Although the whiteboard does not need it, we may implement other widgets later that require editing rich text.
Rich text editing is a strength of Yjs.

### Designing the Data Model

Now that a library is selected, we need to design the data structure stored in the CRDT document.

#### Relation of Documents

We see two possible ways for modeling documents:

1. There is one document per whiteboard.
2. There is a metadata document per whiteboard that references documents per slide.

[Yjs][yjs-structure-smaller-documents] and [Automerge][automerge-how-many-documents] make suggestion on modeling CRDT documents.
Both suggest to model smaller documents, for example for performance reasons.
But they also note, that syncing a lot of documents might be an issue.
For us, choosing the second option is problematic as it requires us to be online to create new slides, as we have to generate a start event for storing new documents.

Both implementations note: _"[…] that an Automerge document is best suited to being a unit of collaboration between two people or a small group"_ and _"it can be good to group data that is often used together"_.
As we see editing the whiteboard as a unit of collaboration, we use a single Yjs document per whiteboard.

#### Single top level YMap

According to [Yjs][yjs-structure-smaller-documents]:

> Consider using a single top-level YMap: Top-level shared types cannot be deleted, so you may want to structure all your data in a single top-level YMap, eg. yDoc.getMap('data').get('page-1').

Therefore, we use a single top level entry and structure our data in a nested YMap.
We use the data model version number as the key to the entry.
This way we are able to later implement new data models and detect these.

#### Reordering of entries

The eventual consistency of CRDTs can be problematic.
We need to keep this in mind while designing our data structure.

Operations inside of maps are usually save and follow these rules:

- Doing the same operation does not conflict.
- Setting two different keys can not conflict.
- Setting the same key will make one change win (the "last" change).
- Deleting a key while editing it, one change will win (the "last" change, or always the deletion?).
- If maps are nested, you can modify the nested map without causing conflicts on the first level.

Operations on arrays are more complicated:

- Add operations do not conflict, as add operations are always performed.
- Delete operations do not conflict, deleting the same index twice will delete only the desired entry. Delete operations are not based on an index, but actually on the entry itself.
- A move operation is not available.

There are two cases, where we have to implement ordering:

- Order of slides in the sidebar.
- Visual order of elements on the canvas (back to front).

When changing the order, we have to move the entry to a different position.
A move operation can be based on removing an entry and adding it again.
This operation can cause issues as it isn't atomic.
If two users perform the same operation, parts of it might conflict, for example:

Two users move the same entry in an array to the end.
The removal will just happen once as the operation is deduplicated, however the entry is added to list twice.

Therefore, we will implement reordering via splitting the data structure into two parts:

```json
{
  "entities": {
    "a": {
      /* Here follows the actual content of the entities */
    },
    "b": {
      /* … */
    },
    "c": {
      /* … */
    },
    "d": {
      /* … */
    }
  },
  // The order of the entities
  "entityIds": ["a", "b", "c", "d"]
}
```

First, we give every entity an identifier and store them in a map.
This makes sure that there are no conflicts between order operations and modifications to the entities.
Second, the order of the ids is stored in a separate list.
Due to the above properties, the order list might contain duplicate entries.
Delete and move operations might conflict too, causing entries to be deleted from the map, but not the list.
An implementation should only consider the first entry and check whether it's still part of the list.
Duplicates and ids pointing to missing entries should be removed from the list when it is modified.

## Consequences

Choosing the CRDT format is not a final decision, we will still be able to switch to a different implementation later.
However, when we do such a change, we need to consider how we migrate old data.

CRDT document snapshots and changes will be received via the network from third parties.
As for all data that we receive, we need to perform input validation.
However, for CRDT documents this is complicated as they contain instructions on how the resulting data will look like.
We have to validate the result before applying the changes to our current state.
This can be done as a dry run, before performing the changes on the actual state.

The full data structure is described in the [CRDT document format][crdt-document-model].
Storage of the CRDT documents in Matrix rooms is further detailed in [ARD005][adr005] and the transmission of real-time updates in [ADR006][adr006].

<!-- This section describes the resulting context, after applying the decision.
All consequences should be listed here, not just the "positive" ones. A particular
decision may have positive, negative, and neutral consequences, but all of them
affect the team and project in the future. -->

<!-- This template is taken from a blog post by Michael Nygard
https://thinkrelevance.com/blog/2011/11/15/documenting-architecture-decisions -->

[crdttech]: https://crdt.tech
[automerge]: https://automerge.org
[automerge-rs]: https://github.com/automerge/automerge-rs
[yjs]: https://yjs.dev/
[adr003]: ./adr003-use-crdts-to-collaborate-on-data.md
[adr005]: ./adr005-data-structure-for-storing-whiteboards-in-matrix-rooms.md
[adr006]: ./adr006-webrtc-for-real-time-communication.md
[matrix-crdt]: https://github.com/YousefED/Matrix-CRDT
[adr002]: ./adr002-multi-layer-communication-and-storage-architecture.md
[gun]: https://github.com/amark/gun
[crdt-benchmarks]: https://github.com/dmonad/crdt-benchmarks
[automerge-perf-comparisons]: https://github.com/alexjg/automerge-perf-comparisons
[crdt-document-model]: ../model/crdt-documents.md
[yjs-structure-smaller-documents]: https://docs.yjs.dev/api/faq#structuring-data-in-smaller-ydocs
[automerge-how-many-documents]: https://automerge.org/docs/cookbook/modeling-data/#how-many-documents
