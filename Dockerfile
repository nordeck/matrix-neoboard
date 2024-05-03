FROM ghcr.io/nordeck/matrix-widget-toolkit/widget-server:1

ARG REACT_APP_VERSION
ARG REACT_APP_REVISION
ENV REACT_APP_VERSION=${REACT_APP_VERSION}
ENV REACT_APP_REVISION=${REACT_APP_REVISION}

ADD build /usr/share/nginx/html/
ADD LICENSE /usr/share/nginx/html/LICENSE.txt

# Allow loading images from all HTTP(s) URLs and blobs
ENV CSP_IMG_SRC="http: https: blob:"

# Allow to fetch data from all HTTP(s) URLs
ENV CSP_CONNECT_SRC="http: https:"
