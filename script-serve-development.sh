#!/bin/bash

export NODE_ENV=development
IP_ADDRESS=`ipconfig getifaddr en0`
webpack-dev-server --content-base bin/ --host 0.0.0.0 --public $IP_ADDRESS:8080
