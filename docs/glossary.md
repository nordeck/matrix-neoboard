# Glossary

This glossary explains commonly used terms in this project.
Feel free to expand it further!

Connection Id
: For real-time communication, a connection is established between all sessions of a whiteboard (full mesh).
Each peer-to-peer connection has an id assigned.

[CRDT](https://crdt.tech/)
: Conflict-free Replicated Data Types can be used to modify data in distributed/replicated systems.

Chunk
: A part of a snapshot.
As Matrix events have a size limit, we have to split snapshots into multiple chunks to be able to store larger whiteboards.

Conflict
: A change that two user perform at the same time that is contradicting.
Like a user changing an element while it is deleted, or two users moving the element at the same time.
Conflicts need a automatic resolution strategy, in our CRDTs, this is "last" change wins.

Document
: A [CRDT](https://crdt.tech/) document, in our case based on Yjs.

Document Id
: An id that references a CRDT document. The document id is the event id of the document create Matrix event.

Element
: In the context of the whiteboard:
Something that is drawn and displayed on a whiteboard slide, like shapes as rectangles, circles, or lines.
[Element](https://element.io/) can also refer to the company that sponsors the development of Matrix and a messenger with the same name.

[Matrix](https://matrix.org/)
: An open source project that builds a secure and decentralized real-time communication platform.

Matrix Room
: A timeline of events that a group of members have access to.

Session
: Users that are active in a whiteboard have a session.
A session is used to implement presence information as well as identifying peers for real-time communication.

Session Id
: Every session is identified by an id.

Slide
: A drawing canvas that users can draw on. Multiple slides are grouped into a whiteboard.

Snapshot
: A immutable version of the whiteboard at a specific state.
Snapshots are used to restore the whiteboard on load and could be used to restore a later version.
Snapshots are stored as room events in Matrix rooms.

Preview
: A preview of the whiteboard's first slide.
Previews can be used by other Matrix clients to show a preview of the whiteboard content before opening or loading it. Previews are stored as room state events.

[WebRTC](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
: A framework for real-time peep-to-peer communication in browsers.

Whiteboard
: A collection of slides that belong to each other.

Whiteboard Id
: Each whiteboard has an id.
The id is the `state_key` of the whiteboard state event.

Widget
: A integration into an Matrix client that is installed into a Matrix room.
It allows to extend the UI of the Matrix client and read and store data in the current Matrix room to solve different use-cases.

[Yjs](https://yjs.dev/)
: A JavaScript CRDT implementation.
