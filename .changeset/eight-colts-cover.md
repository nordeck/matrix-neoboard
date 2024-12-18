---
'@nordeck/matrix-neoboard-widget': patch
'@nordeck/matrix-neoboard-react-sdk': patch
---

cleanup to properly revoke object URLs using `URL.revokeObjectURL()` when the component is unmounted or `imageUri` changes.
