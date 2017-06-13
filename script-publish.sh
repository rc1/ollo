#!/bin/bash

export NODE_ENV=production
webpack
rsync -rhv --progress --exclude=".*" bin/ workersWebfaction:webapps/ollo 
