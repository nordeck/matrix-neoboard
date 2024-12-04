---
'@nordeck/matrix-neoboard-react-sdk': minor
---

Ensure that we calculate the mime types ourself due to browsers only checking the file ending and the data on import being untrsuted user input.

This allows that SVGs are properly working inside of pdf exports and images handling is more stable.
