FROM node:latest
MAINTAINER fnndsc "dev@babymri.org"

# Install bower and polymer-cli
RUN npm install -g bower polymer-cli@next

# Install bower deps
RUN mkdir -p /src/chris-ultron-deps
COPY bower.json /src/chris-ultron-deps/
WORKDIR /src/chris-ultron-deps
RUN bower install --allow-root

# Start dev server
WORKDIR /src/chris-ultron
EXPOSE 8080
COPY ./docker-entrypoint.sh /
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["polymer", "serve", "--hostname", "0.0.0.0"]
