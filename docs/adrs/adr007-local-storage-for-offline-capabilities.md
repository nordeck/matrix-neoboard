# ADR007: Local Storage for Offline Capabilities

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

[ADR002][adr002] introduces the concept of offline storage into the architecture.
The offline storage is a local, per device cache for the whiteboard CRDT documents described in [ADR004][adr004].
There are several reasons for which such a storage is desired:

- **Protect from data loss**: Our widget runs inside an iframe that a user can decide to close at any time.
  There is no feedback to the widget that it is closed, therefore we are unable to store the latest state to the room before closing.
  We are notified via events, however are unable to run asynchronous operations as part of these events.
  Therefore we want to store changes regularly locally and restore them the next time the whiteboard widget is opened.
- **Offline editing**: In case of connectivity issues the user wants to be able to edit locally, without loosing data if writing snapshots into the Matrix room fails (see [ADR005][adr005]).
  The user should be able to sync his changes once connectivity is available again.
- **Improved performance**: As a whiteboard can consist of multiple snapshots and each of them out of multiple chunks, it might take some time till all required data is loaded.
  Lazy loading of events, end-to-end encryption, or invalid snapshots (e.g. snapshots that are still being written) have an impact on the load performance.
  The list of whiteboards will require that a lot of whiteboards are loaded to display thumbnails.
  Therefore caching the documents locally will improve the load time of the documents.
  Even though locally stored documents might not be up to date, they can be enhanced with the latest state from the Matrix room once it arrives.

The Web platform provides multiple storage APIs:

- **[Local Storage][mdn-localstorage]**: Most commonly available API, providing a simple key-value storage.
- **[IndexedDB][mdn-indexeddb]**: A simple key-value based database, with support for indices.
- **WebSQL**: A now deprecated API with the goal to provide a SQL compatible database.
- **[CacheStorage][mdn-cachestorage]**: A API for controlling the browser cache in combination with service workers.

## Decision

<!-- This section describes our response to these forces. It is stated in full
sentences, with active voice. "We will ..." -->

We will use an offline storage to improve performance, protect from data loss and handle connectivity issues.
We prefer storing data in IndexedDB as it has support for binary data (like `Uint8Array`), however due to the higher availability of Local Storage we should support both.
As Local Storage and IndexedDB don't automatically evict old unused data, we will use a least recently used (LRU) storage policy with a fixed size.
This avoids that we run into the size quota of the storage.

## Consequences

To avoid dealing with the complexity of IndexedDB and the complexity to handle both Local Storage and IndexedDB, we can use a common wrapper like [LocalForage][localforage].

<!-- This section describes the resulting context, after applying the decision.
All consequences should be listed here, not just the "positive" ones. A particular
decision may have positive, negative, and neutral consequences, but all of them
affect the team and project in the future. -->

<!-- This template is taken from a blog post by Michael Nygard
https://thinkrelevance.com/blog/2011/11/15/documenting-architecture-decisions -->

[adr002]: ./adr002-multi-level-communication-and-storage-architecture.md
[adr004]: ./adr004-using-yjs-as-a-crdt-implementation.md
[adr005]: ./adr005-data-structure-for-storing-whiteboards-in-matrix-rooms.md
[mdn-indexeddb]: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
[mdn-localstorage]: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
[mdn-cachestorage]: https://developer.mozilla.org/en-US/docs/Web/API/CacheStorage
[localforage]: https://github.com/localForage/localForage
