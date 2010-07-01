#!/bin/bash

ZIP=thrust-current.zip

rm $ZIP
jar Mcvf $ZIP ./*
rsync -rvIz --rsh=ssh --delete --exclude=.git ./ myweb:/var/www/static/demo/thrust
