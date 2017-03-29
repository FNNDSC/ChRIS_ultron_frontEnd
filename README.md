# chris-ultron front end.

- [Pre-requisites](#pre-requisites)
  - [Get the source code](#get-the-source-code)
- [For users](#for-users)
  - [Start the server](#start-the-server)
- [For developers](#for-developers)
  - [Install NPM](#install-npm)
  - [Install Bower](#install-bower)
  - [Get the polymer cli](#get-the-latest-polymer-cli)
  - [Install the npm/bower dependencies](#install-the-npm-bower-dependencies)
  - [Start the default development server](#start-the-default-development-server)
  - [Build](#build)
  - [Preview the build](#preview-the-build)
  - [Run tests](#run-tests)

[Table of contents generated with markdown-toc](http://ecotrust-canada.github.io/markdown-toc/)

## Pre-requisites

### Get the source code

Use **git** to fetch the source code.

    git clone https://github.com/FNNDSC/ChRIS_ultron_frontEnd.git

## For users

### Start the dock

``` diff
- If the command does not work, please contact the dev team.
```

This command serves the app at [http://localhost:8060](http://localhost:8060):

    docker-compose up

Go to [http://localhost:8060](http://localhost:8060).

You should see the `Login` of the website.

    Pro-tip: To stop the server, hit `control` + `c` keys at the same.

### Edit the settings

## For developers

### Install npm

[NPM Official Website](https://nodejs.org/en/download/)

### Install bower

    npm install -g bower

### Get the latest polymer cli

    npm install -g polymer-cli@next

### Install the npm/bower dependencies

    bower install && \
    npm install

### Start the default development server

This command serves the app at [http://localhost:8081](http://localhost:8081):

    polymer serve

### Build

This command builds the app at `/build/`. There is a `es5` and `es6` build. We currently use the `es6` build.

    polymer build

### Preview the build

    polymer serve build/bunes6ed

### Run tests

    polymer test