# ADR003: Use CRDTs to Collaborate on Data

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

During collaboration, different users might end up editing the same elements on the whiteboard.
Right now, we can handle concurrent modifications of different elements by different users on the same whiteboard.
Such changes don’t conflict as each whiteboard element is an own event.
However, changes to the same element can cause conflicts.
For example, a user might change the position of an element, while another user is changing the color.
Currently, when such conflict occurs, the "last" change wins.
In this example, if changing the position happens after the user changes to color, the color change is lost.
Defining what the "last" change is can be a bit unintuitive and inconsistent in a distributed system like the Matrix protocol.

Another factor for concurrent modifications is the decentral nature of the Matrix protocol.
Data in a Matrix room can be replicated via federation on multiple home servers.
Being decentral means that the state is eventual consistent.
Due to network, utilization, or even connectivity issues, it can take some time till all involved widgets show the same state.
A user might even be offline and unable to synchronize with the homeserver.
This can cause split world scenarios, where users might see different states of the whiteboard that they interact on.
In general we should consider this the normal, not the exceptional state, and design our whiteboard to handle these cases.

It's desired to resolve conflicts on a property level, e.g. color or position, instead of element level.
We always want to be able to resolve conflicts in a predictable manner.
A desired conflict resolution behavior is "last" change wins.
We need to find a data structure that allows such behavior.

## Decision

<!-- This section describes our response to these forces. It is stated in full
sentences, with active voice. "We will ..." -->

We will use [Conflict-free Replicated Data Types (CRDT)][crdttech] to handle concurrent edits to the whiteboard state.
We will transmit changes to the whiteboard state via our real-time communication layer and write the state in the Matrix room for persistence storage.

CRTDs can be compared to using Git for version control.
The different versions of a state can be compared to commits in a Git repository.
If two users start with the same state (forking the central repository), they can perform changes to the local version of the state (performing commits in the working copy), and merge the states together resulting in the same state for both users.
One thing that is different when comparing CRDTs with Git is, that conflicts can always automatically be resolved.

```
┌───────┐
│       │                ┌────┐
│ Alice │ {a: 1, b: 0} ─►│.a=2│  ─────────► {a: 2, b: 0} ──┬─────────┬──► {a: 2, b: 1}
│       │                └────┘                            │         │
└───────┘                                                  │         │
                                                           │  Merge  │
┌───────┐                                                  │         │
│       │                ┌────┐   ┌────┐                   │         │
│ Bob   │ {a: 1, b: 0} ─►│.a=3├──►│.b=1├──► {a: 3, b: 1} ──┴─────────┴──► {a: 2, b: 1}
│       │                └────┘   └────┘
└───────┘
```

CRDTs provide us with the following properties:

- We are always able to merge states with a built-in merge resolution strategy.
  It's not guaranteed to have a "last" change wins strategy, but the behavior is similar to it.
- We can merge states in any order and receive the same result.
- We can rely that two parties performing a merge of two states end up with the same result.
- We can encode changes and transmit them via our real-time communication layer without having to transmit the whole state.

### Alternatives

As we are already able to resolve conflicts on the level of elements it might be an option to extend our data model to use events on property level.
However, sending an event per element property causes issues with rate limiting (see [ADR002][adr002]).

## Consequences

### Authorization

Storing the data in a CRDT makes operations independent from Matrix, which has the consequences that we can not take advantage of the authorization for operations by the Matrix home server.
Note that the power level authorization system of Matrix protocol is not effective once end-to-end encryption is used, as the home server is not able to introspect the event types send by clients.
With CRDTs we have no central authority to govern operations on the shared CRDT state, all operations are performed in the distributed system.
Features like locked elements of slides can therefore only be implemented as visual features.
Clients, for example ones that are modified, cannot be prevented from performing these operations.
This requires trust between all peers that take part in editing the state.
However, membership of the Matrix rooms is an authorization system that is still in place.

### Implementation

Implementing CRDT algorithms reliably and performant is complex.
We should concentrate on designing our data model to match into existing CRDT implementations.
[ADR004][adr004] chooses a CRDT implementations and specifies our data model.

<!-- This section describes the resulting context, after applying the decision.
All consequences should be listed here, not just the "positive" ones. A particular
decision may have positive, negative, and neutral consequences, but all of them
affect the team and project in the future. -->

<!-- This template is taken from a blog post by Michael Nygard
https://thinkrelevance.com/blog/2011/11/15/documenting-architecture-decisions -->

[crdttech]: https://crdt.tech
[adr002]: ./adr002-multi-level-communication-and-storage-architecture.md
[adr004]: ./adr004-using-yjs-as-a-crdt-implementation.md
