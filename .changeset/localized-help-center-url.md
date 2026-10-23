---
'@nordeck/matrix-neoboard-react-sdk': minor
'@nordeck/matrix-neoboard-widget': minor
---

Link to the manual in the user's language in the help menu, configured via `REACT_APP_HELP_CENTER_URL_EN` and `REACT_APP_HELP_CENTER_URL_DE`. Only `http(s)` URLs are accepted.

`REACT_APP_HELP_CENTER_URL` is deprecated and will be removed in the next major version. Until then it is used as the english link if `REACT_APP_HELP_CENTER_URL_EN` is not set, and a warning is logged in the browser console. Please note:

- The help menu item is now labeled "User guide" ("Handbuch" in German) instead of "Help Center", also for a link configured via `REACT_APP_HELP_CENTER_URL`.
- `REACT_APP_HELP_CENTER_URL` is now only used if it is an absolute `http(s)` URL. Other values are ignored and a warning is logged in the browser console.
