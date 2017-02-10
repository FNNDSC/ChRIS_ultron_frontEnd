FROM node:latest
MAINTAINER fnndsc "dev@babymri.org"

# Install bower and polymer-cli
RUN npm install -g bower polymer-cli

# Install bower deps
RUN mkdir -p /src/chris-ultron
WORKDIR /src/chris-ultron

COPY bower.json /src/chris-ultron/
RUN echo '{ "allow_root": true }' > /root/.bowerrc
RUN bower install

# Bundle app source
ADD . /src/chris-ultron

# Start dev server
EXPOSE 8080
CMD ["polymer", "serve", "--hostname", "0.0.0.0"]
