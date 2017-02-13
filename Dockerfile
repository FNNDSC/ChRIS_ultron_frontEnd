FROM node:latest
MAINTAINER fnndsc "dev@babymri.org"

# Install bower and polymer-cli
RUN npm install -g bower polymer-cli

# Install bower deps
COPY bower.json /src/chris-ultron/
WORKDIR /src/chris-ultron
RUN bower install --allow-root

# Bundle app source
COPY . /src/chris-ultron

# Start dev server
EXPOSE 8080
CMD ["polymer", "serve", "--hostname", "0.0.0.0"]
