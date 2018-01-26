#!/usr/bin/env bash

google-chrome --incognito http://localhost:9527
python -m SimpleHTTPServer 9527
