---
'@nordeck/matrix-neoboard-react-sdk': patch
---

Fix peer connection cleanup in the communication channels: the MatrixRTC channel no longer accumulates closed peer connections across reconnects, and the WebRTC channel closes remaining peer connections on destroy even when no session-left event is received.
