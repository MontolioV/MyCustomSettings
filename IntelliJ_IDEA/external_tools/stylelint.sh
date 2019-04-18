#!/usr/bin/env bash

filename=$(basename -- "$1")
extension="${filename##*.}"

if [[ "$extension" = "css" ||"$extension" = "scss" || "$extension" = "sass" ]]; then
    PATH=$PATH:/home/user123/.nvm/versions/node/v10.15.2/bin
    stylelint --fix $1
fi;


