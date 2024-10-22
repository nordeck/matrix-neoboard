---
'@nordeck/matrix-neoboard-widget': major
'@nordeck/matrix-neoboard-react-sdk': major
---

Migrate neoboard to vitejs + vitest

We replaced react-scripts with vitejs and jest with vitest. This change should not affect the functionality of the widget,
but it allows us to update dependencies and modernize the build process. It also improves the ability to react to security issues in the future.

However there are changes to the tooling. This will only affect you if you are building the widget yourself and do not use the provided build script.
This means that you will need to update your build script to use vitejs instead of react-scripts. Additionally, if you had custom changes to the configurations you will have to update them to the vitejs equivalent.

Finally, the package is now an ECMAScript module (ESM). This means that you might have to update your imports if you consumed the package directly.
