# Project Overview

## Description

《志怪塔》—— 中式志怪 Roguelike 卡牌爬塔小游戏（纯前端单页 HTML/JS/CSS）。
三幕爬塔、地图分支、卡牌构筑、锻造/净坛/事件/商店、9 大 Boss、四角色（符箓天师 / 苦行武僧 /
赶尸人 / 血祭阴差）、遗物与灵汁、里程碑奖励、本机+TapTap 全平台排行榜、云存档。
商业模式：纯 IAA 无内购（无需版号）；发行方向 TapTap H5 小游戏 + PWA 网页。

## Objectives

- 真人真机试玩迭代，原型同时承担「可玩 demo」与「设计规格书」（未来进 Cocos 只搬设计决定）。
- 手机端与网页端双端体验一致，强制横屏、PWA 可装、低端机性能可控（性能读数开关）。
- TapTap 上架：包体合规（zip 第一级唯一英文/数字文件夹 + game/index.html）、排行榜/云存档接官方接口。

## Technologies

- 原生 HTML + CSS + JavaScript（ES5 风格为主），8 段同作用域顺序拼接，无框架、无打包器。
- Python 3 + Pillow 负责打包（图片转 WebP / base64 内联 / JS 混淆 / PWA 拆包 / TapTap zip）。
- 校验：node（node --check、VM 断言、无头冒烟）、python（静态/行为探针）。
- 素材：WebP（图）、mp3/wav（音）、精灵图按排切片；ffmpeg（WinGet 路径）转音频。

## Architecture

- 单页 + overlay 场景切换；战斗为状态机驱动 + DOM 渲染；fx 分层（#fx-layer/#anim-layer）。
- 三槽本地存档 + 云端同步适配层（运行时探测宿主接口，同步/异步两套）。
- Service Worker 离线缓存（仅 --split 产物注入，开发树不注册 SW）。

## Project Structure

- `原型.html` 入口（开发树）；`js/00_base … 60_boot` 八段脚本；`素材/` 全部美术音频。
- `打包.py` 多口径打包（单文件 / 拆包 PWA / TapTap 单文件 / TapTap 多文件）；`提交.py` git 辅助。
- `_patch/` 校验闸与探针（verify_dist / probe_dist / verify_web / _probe_cloud / run_smoke 等）。
- `dist/` 产物：`志怪塔.html`（单文件）、`web/`（拆包 PWA）、`志怪塔_TapTap包体.zip`（单文件版）、
  `志怪塔_TapTap包体_多文件.zip`（v1.1.11 新增，zip 内 game/* 相对路径）。
- `memory-bank/` 项目记忆（本目录）；设计 md 全部在工程根。
- 外部资产源：`C:\Users\HP\deepseekharness\boss_vfx\`（9 Boss 技能特效包，46 段 + 40 音效）。
