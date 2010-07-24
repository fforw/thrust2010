#!/bin/bash

ZIP=thrust-current.zip

echo "" > thrust-all.js
for i in json2.js rtree.js jquery-1.4.2.min.js jquery.cookies.js Class.js vecmath.js util.js thrust-base.js alien.js thrust.js levels.js; do
	java -jar yuicompressor-2.4.2.jar $i >> thrust-all.js

done

rm $ZIP
jar Mcvf $ZIP ./*
rsync -rvIz --rsh=ssh --delete --exclude=.git ./ myweb:/var/www/static/demo/thrust

rsync -rvIz --rsh=ssh index.prod.html myweb:/var/www/static/demo/thrust/index.html
