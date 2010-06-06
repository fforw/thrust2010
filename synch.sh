#!/bin/bash
rsync -rvIz --rsh=ssh --delete --exclude=.git ./ myweb:/var/www/static/demo/thrust
