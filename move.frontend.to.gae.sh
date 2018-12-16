#!/usr/bin/env bash

# to to cryptonomica directory
cd ../cryptonomica/src/main/webapp/
# list files
ls -latF

# remove all files exept WEB-INF directory
shopt -s extglob
rm -rv !("WEB-INF")
shopt -u extglob
# check result
ls -latF

# return to cryptonomica.github.io directory
cd ../../../../cryptonomica.github.io/

# copy all files from cryptonomica.github.io:
cp -rvu . ../cryptonomica/src/main/webapp/

# remove cryptonomica.github.io specific files:
rm -rfv ../cryptonomica/src/main/webapp/.idea
rm -rfv ../cryptonomica/src/main/webapp/cryptonomica.github.io.iml
rm -rfv ../cryptonomica/src/main/webapp/cryptonomica.github.io.sublime-project
rm -rfv ../cryptonomica/src/main/webapp/cryptonomica.github.io.sublime-workspace
rm -rfv ../cryptonomica/src/main/webapp/.gitignore
rm -rfv ../cryptonomica/src/main/webapp/.git
rm -rfv ../cryptonomica/src/main/webapp/move.frontend.to.gae.sh
# show files in cryptonomica:
ls -latF ../cryptonomica/src/main/webapp/
