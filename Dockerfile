FROM node:latest
MAINTAINER fnndsc "dev@babymri.org"

# Install bower and polymer-cli
RUN npm install -g bower polymer-cli

# Create app directory
RUN mkdir -p /usr/src/chris-ultron
WORKDIR /usr/src/chris-ultron

# Install app dependencies
COPY bower.json /usr/src/chris-ultron/
RUN echo '{ "allow_root": true }' > /root/.bowerrc
RUN bower install

# Bundle app source
COPY . /usr/src/chris-ultron

EXPOSE 8080
CMD ["polymer", "serve", "--hostname", "0.0.0.0"]
