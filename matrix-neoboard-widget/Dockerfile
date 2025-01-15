FROM aquasec/trivy:latest AS scanner

# Copy yarn.lock to run SBOM scan
COPY --from=root yarn.lock /tmp
RUN trivy fs --format spdx-json --scanners "vuln,license" /tmp/yarn.lock > /tmp/sbom.spdx.json

FROM ghcr.io/nordeck/matrix-widget-toolkit/widget-server:1.1.0@sha256:85b4bf57747788ef1ac3472a826502219be20e7b1fffff6193ad4c0b0ccbc42d

ARG REACT_APP_VERSION
ARG REACT_APP_REVISION
ENV REACT_APP_VERSION=${REACT_APP_VERSION}
ENV REACT_APP_REVISION=${REACT_APP_REVISION}

ADD --chown=nginx:nginx build /usr/share/nginx/html/

# Add SBOM to the public folder
COPY --from=scanner --chown=nginx:nginx /tmp/sbom.spdx.json /usr/share/nginx/html/sbom.spdx.json

# Allow loading images from all HTTP(s) URLs and blobs
ENV CSP_IMG_SRC="http: https: blob:"
# Also with fetch/XMLHttpRequest
ENV CSP_CONNECT_SRC="http: https: blob:"
