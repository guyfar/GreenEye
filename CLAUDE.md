# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

护眼阅读助手 - Chrome/Dia 浏览器扩展，通过蓝光过滤和主题切换保护用户眼睛健康。

## Development

```bash
# 无需构建，直接加载开发
# Chrome: chrome://extensions → 开发者模式 → 加载已解压的扩展程序 → 选择项目根目录
# Dia: 同 Chrome 操作
```

## Architecture

Chrome Extension Manifest V3 项目，兼容所有 Chromium 内核浏览器。

```
├── manifest.json          # 扩展配置 (Manifest V3)
├── background/
│   └── service-worker.js  # 后台服务：初始化、标签页监听
├── content/
│   ├── content.js         # 核心护眼逻辑：主题/蓝光过滤注入
│   └── content.css        # 基础样式
├── popup/
│   ├── popup.html         # 弹窗 UI
│   ├── popup.css          # 弹窗样式
│   └── popup.js           # 弹窗交互逻辑
└── icons/                 # 扩展图标
```

## Key Implementation Details

**护眼效果实现 (content/content.js)**
- 蓝光过滤：CSS `filter: sepia() saturate()` 组合
- 主题切换：动态注入 `<style>` 标签覆盖页面样式
- 网站记忆：`chrome.storage.sync` 按域名存储偏好

**预设主题色值**
| 主题 | 背景色 | 文字色 |
|------|--------|--------|
| 豆沙绿 | #C7EDCC | #2d4a3e |
| 羊皮纸 | #FAF9DE | #4a4530 |
| 暖夜灯 | #FDF5E6 | #4a3f2f |
| 深邃黑 | #1A1A1A | #E0E0E0 |

**消息通信**
- `UPDATE_SETTINGS`: popup → content，更新护眼设置
- `GET_DOMAIN`: popup → content，获取当前域名
- 存储变化通过 `chrome.storage.onChanged` 自动同步
