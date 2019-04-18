#!/usr/bin/env bash

# $1 - full path to lintered file
filename=$(basename -- "$1")
extension="${filename##*.}"

if [[ "$extension" = "css" ||"$extension" = "scss" || "$extension" = "sass" ]]; then
    # $2 - path to node bins, example '/home/user123/.nvm/versions/node/v10.15.2/bin'
    PATH=$PATH:$2
    stylelint --fix $1
fi;


