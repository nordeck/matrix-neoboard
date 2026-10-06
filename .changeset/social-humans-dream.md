---
'@nordeck/matrix-neoboard-react-sdk': minor
---

After the document has been loaded all elements will be sorted in a stable way: frames will be sent to the background, below other element types, maintaining their relative z-order. Operations "bring forward/to front" and "bring backward/to back" will not send shapes below frames or frames above shapes.
