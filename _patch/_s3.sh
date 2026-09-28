#!/bin/bash
run(){ python _patch/shot.py --direct --drv _patch/_drvclip.js --widths $1 --h $2 --m "$3" --q "&e=$4&n=$5" --dump 2>&1 | grep -m1 "内部溢出" | sed 's/.*内部溢出)=//'; }
for v in "844 390" "640 360" "960 540"; do set -- $v
  a=$(run $1 $2 "" huyao,shuigui,youhun 10)
  b=$(run $1 $2 log-open huyao,shuigui,youhun 10)
  c=$(run $1 $2 "" jiangwang 10)
  d=$(run $1 $2 log-open baiwuchang,huyao 10)
  echo "  $1x$2  n=10 关[3min=$a boss=$c] 抽屉[3min=$b elite+min=$d]"
done
