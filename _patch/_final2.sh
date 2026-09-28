#!/bin/bash
run(){ python _patch/shot.py --direct --drv _patch/_drvclip.js --widths $1 --h $2 --m "$3" --q "&e=$4&n=$5" --dump 2>&1 | grep -m1 "内部溢出" | sed 's/.*内部溢出)=//'; }
for v in "1920 1080" "1440 900" "1366 768" "1280 720" "1024 768" "960 540" "844 390" "640 360"; do set -- $v
for n in 8 10; do
  a=$(run $1 $2 "" jiangwang $n); b=$(run $1 $2 "" baiwuchang,huyao $n); c=$(run $1 $2 "" huyao,shuigui,youhun $n)
  d=$(run $1 $2 log-open jiangwang $n); e=$(run $1 $2 log-open baiwuchang,huyao $n); f=$(run $1 $2 log-open huyao,shuigui,youhun $n)
  echo "  $1x$2  n=$n  关[$a $b $c]  抽屉[$d $e $f]"
done; done
