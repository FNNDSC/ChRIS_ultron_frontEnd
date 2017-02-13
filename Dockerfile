FROM node:latest
MAINTAINER fnndsc "dev@babymri.org"

# Install bower and polymer-cli
RUN npm install -g bower polymer-cli

# Install bower deps
RUN mkdir -p /src/chris-ultron-deps
COPY bower.json /src/chris-ultron-deps/
WORKDIR /src/chris-ultron-deps
RUN bower install --allow-root

# Bundle app source
COPY . /src/chris-ultron

# Start dev server
WORKDIR /src/chris-ultron
EXPOSE 8080
CMD ["polymer", "serve", "--hostname", "0.0.0.0"]
