FROM ghcr.io/nordeck/matrix-widget-toolkit/widget-server:1.1.0@sha256:85b4bf57747788ef1ac3472a826502219be20e7b1fffff6193ad4c0b0ccbc42d

ARG REACT_APP_VERSION
ARG REACT_APP_REVISION
ENV REACT_APP_VERSION=${REACT_APP_VERSION}
ENV REACT_APP_REVISION=${REACT_APP_REVISION}

ADD build /usr/share/nginx/html/

# Allow loading images from all HTTP(s) URLs and blobs
ENV CSP_IMG_SRC="http: https: blob:"
# Also with fetch/XMLHttpRequest
ENV CSP_CONNECT_SRC="http: https: blob:"
