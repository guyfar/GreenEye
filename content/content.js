/**
 * 护眼阅读助手 - Content Script
 * 核心护眼功能实现
 */

// 预设主题配置
const THEMES = {
  'green': {
    name: '豆沙绿',
    background: '#C7EDCC',
    text: '#2d4a3e',
    link: '#1a6840'
  },
  'paper': {
    name: '羊皮纸',
    background: '#FAF9DE',
    text: '#4a4530',
    link: '#8b6914'
  },
  'warm': {
    name: '暖夜灯',
    background: '#FDF5E6',
    text: '#4a3f2f',
    link: '#8b5a00'
  },
  'dark': {
    name: '深邃黑',
    background: '#1A1A1A',
    text: '#E0E0E0',
    link: '#6CB2EB'
  }
};

// 默认设置
const DEFAULT_SETTINGS = {
  enabled: false,
  theme: 'green',
  blueFilter: 30,
  customSettings: {},
  autoDetectDarkMode: true  // 是否自动检测深色模式
};

// 当前设置
let currentSettings = { ...DEFAULT_SETTINGS };

// 初始深色模式检测结果（只在页面加载时检测一次）
let initialDarkModeDetected = null;

// 检测网站是否使用深色模式（只在首次调用时检测，之后缓存结果）
function detectDarkMode() {
  // 如果已经检测过，返回缓存的结果
  if (initialDarkModeDetected !== null) {
    return initialDarkModeDetected;
  }

  // 首次检测，在我们的样式应用之前进行
  let isDark = false;

  // 检测 CSS prefers-color-scheme
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    isDark = true;
  }

  // 检测常见深色模式类名（这个不受我们样式影响）
  if (!isDark) {
    const html = document.documentElement;
    const body = document.body;
    const darkClassPatterns = ['dark', 'night', 'theme-dark', 'dark-mode', 'dark-theme'];
    const classNames = (html.className + ' ' + (body?.className || '')).toLowerCase();
    isDark = darkClassPatterns.some(pattern => classNames.includes(pattern));
  }

  // 缓存结果
  initialDarkModeDetected = isDark;
  return isDark;
}

// 获取当前网站域名
function getCurrentDomain() {
  return window.location.hostname;
}

// 创建或获取样式元素
function getStyleElement(id) {
  let style = document.getElementById(id);
  if (!style) {
    style = document.createElement('style');
    style.id = id;
    (document.head || document.documentElement).appendChild(style);
  }
  return style;
}

// 创建或获取 SVG 滤镜元素
function getSvgFilter() {
  let svg = document.getElementById('eye-care-svg-filter');
  if (!svg) {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'eye-care-svg-filter';
    svg.setAttribute('style', 'position:absolute;width:0;height:0;pointer-events:none;');
    svg.innerHTML = `
      <defs>
        <filter id="blue-light-filter" color-interpolation-filters="sRGB">
          <feColorMatrix type="matrix" id="blue-filter-matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"/>
        </filter>
      </defs>
    `;
    (document.body || document.documentElement).appendChild(svg);
  }
  return svg;
}

// 应用蓝光过滤
// 原理：降低蓝色通道 + 微降亮度，模拟真实蓝光过滤镜片效果
function applyBlueFilter(intensity) {
  const style = getStyleElement('eye-care-blue-filter');

  if (intensity > 0) {
    // 确保 SVG 滤镜存在
    const svg = getSvgFilter();
    const matrix = svg.querySelector('#blue-filter-matrix');

    // 计算滤镜参数 (intensity: 0-100)
    const t = intensity / 100;

    // 蓝色通道降低 (100% 时降至 0.4，过滤 60% 蓝光)
    const blue = 1 - (t * 0.6);

    // 红绿通道保持不变，但整体微降亮度以减少刺眼感
    // 100% 时整体亮度降至 95%
    const brightness = 1 - (t * 0.05);

    // 颜色矩阵: [R_in, G_in, B_in, A_in, offset] x 4 行
    // 每行决定输出通道如何从输入通道计算
    const matrixValues = `
      ${brightness.toFixed(3)} 0 0 0 0
      0 ${brightness.toFixed(3)} 0 0 0
      0 0 ${(blue * brightness).toFixed(3)} 0 0
      0 0 0 1 0
    `.trim().replace(/\s+/g, ' ');

    matrix.setAttribute('values', matrixValues);

    style.textContent = `
      @media screen {
        html {
          filter: url(#blue-light-filter) !important;
        }
      }
      @media print {
        html {
          filter: none !important;
        }
      }
    `;
  } else {
    // 强度为0时，清理样式和SVG滤镜
    style.textContent = '';
    const svgFilter = document.getElementById('eye-care-svg-filter');
    if (svgFilter) svgFilter.remove();
  }
}

// 应用主题
function applyTheme(themeName) {
  const style = getStyleElement('eye-care-theme');
  const theme = THEMES[themeName];

  if (!theme) {
    style.textContent = '';
    return;
  }

  // 根据主题确定代码块和卡片背景色
  const codeBg = themeName === 'dark' ? '#2d2d2d' : `color-mix(in srgb, ${theme.background} 90%, ${theme.text} 10%)`;
  const cardBg = themeName === 'dark' ? '#252525' : theme.background;

  style.textContent = `
    @media screen {
      /* ========== 护眼主题：${theme.name} ========== */

      /* 说明：只改 background-color / color，避免使用 background 简写破坏 background-image */

      /* 1. 根元素和主体背景 */
      html, body {
        background-color: ${theme.background} !important;
        color: ${theme.text} !important;
      }

      /* 2. 通用容器背景 - 只设置 background-color */
      div:not(.img):not([role="dialog"]):not([role="alertdialog"]):not([role="tooltip"]):not([aria-modal="true"]):not([style*="position: fixed"]):not([style*="position:fixed"]):not([class*="nav"]):not([class*="menu"]):not([class*="sidebar"]):not([class*="modal"]):not([class*="popup"]):not([class*="dropdown"]):not([class*="tooltip"]):not([class*="dialog"]):not([class*="overlay"]):not([class*="header"]):not([class*="footer"]):not([class*="toolbar"]):not([class*="btn"]):not([class*="button"]):not([class*="icon"]):not([class*="avatar"]):not([class*="logo"]):not([class*="img"]):not([class*="image"]):not([class*="video"]):not([class*="player"]):not([class*="slider"]):not([class*="carousel"]):not([class*="tab"]):not([class*="chip"]):not([class*="badge"]):not([class*="tag"]):not([class*="label"]):not([class*="toast"]):not([class*="snack"]):not([class*="alert"]):not([class*="notification"]):not([class*="resizable"]) {
        background-color: ${theme.background} !important;
      }

      /* 3. 主要内容区域 */
      article, main, section:not([class*="nav"]):not([class*="menu"]),
      .article, .post, .content, .content-body, .post-content, .entry-content,
      .markdown-body, .rich-text, .text-content, .page-content,
      .wrapper, .container:not([class*="nav"]):not([class*="menu"]) {
        background-color: ${theme.background} !important;
      }

      /* 4. 输入框和表单元素 */
      input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]):not([type="file"]),
      textarea,
      [contenteditable="true"],
      .input, .textarea, .search-box, .search-input, .searchbar,
      [class*="input"]:not([class*="btn"]):not([class*="button"]),
      [class*="search"]:not([class*="btn"]):not([class*="button"]):not([class*="icon"]) {
        background-color: ${cardBg} !important;
        color: ${theme.text} !important;
        border-color: ${theme.text}30 !important;
      }

      /* 5. 卡片和面板 */
      .card, .panel, .box, .block, .tile, .item,
      [class*="card"]:not([class*="icon"]),
      [class*="panel"],
      [class*="box"]:not([class*="checkbox"]):not([class*="icon"]) {
        background-color: ${cardBg} !important;
      }

      /* 6. 文字颜色 */
      body, p, li, dd, dt, td, th, label, legend,
      h1, h2, h3, h4, h5, h6,
      article, main, section,
      .text, .title, .desc, .description {
        color: ${theme.text} !important;
      }

      /* 7. 内联元素 */
      strong, em, b, i, u, small, mark, del, ins, sub, sup {
        color: ${theme.text} !important;
      }
      mark {
        background-color: ${themeName === 'dark' ? '#665500' : '#fff3cd'} !important;
      }

      /* 8. 链接颜色 */
      a:not([class*="btn"]):not([class*="button"]):not([role="button"]):not([class*="nav"]):not([class*="menu"]) {
        color: ${theme.link} !important;
      }
      a:not([class*="btn"]):not([class*="button"]):not([role="button"]):not([class*="nav"]):not([class*="menu"]):visited {
        color: ${theme.link} !important;
        opacity: 0.85;
      }
      a:not([class*="btn"]):not([class*="button"]):not([role="button"]):hover {
        opacity: 0.8;
      }

      /* 9. 表格 */
      table {
        background-color: ${theme.background} !important;
      }
      td, th {
        background-color: ${theme.background} !important;
        border-color: ${theme.text}25 !important;
      }
      tr:nth-child(even) td {
        background-color: ${cardBg} !important;
      }

      /* 10. 代码块 */
      pre, code, kbd, samp, var,
      .code, .codeblock, .highlight,
      [class*="code"]:not([class*="icon"]) {
        background-color: ${codeBg} !important;
        color: ${theme.text} !important;
      }

      /* 11. 引用和分隔线 */
      blockquote, q {
        background-color: ${cardBg} !important;
        color: ${theme.text} !important;
        border-left-color: ${theme.link} !important;
      }
      hr {
        border-color: ${theme.text}20 !important;
        background-color: ${theme.text}20 !important;
      }

      /* 12. 列表 */
      ul, ol, dl {
        color: ${theme.text} !important;
      }
    }
  `;
}

// 移除所有护眼效果
function removeAllEffects() {
  const blueFilter = document.getElementById('eye-care-blue-filter');
  const themeStyle = document.getElementById('eye-care-theme');
  const svgFilter = document.getElementById('eye-care-svg-filter');

  if (blueFilter) blueFilter.textContent = '';
  if (themeStyle) themeStyle.textContent = '';
  if (svgFilter) svgFilter.remove();
}

// 应用设置
function applySettings(settings) {
  currentSettings = { ...DEFAULT_SETTINGS, ...settings };
  if (!currentSettings.customSettings || typeof currentSettings.customSettings !== 'object' || Array.isArray(currentSettings.customSettings)) {
    currentSettings.customSettings = {};
  }

  if (!currentSettings.enabled) {
    removeAllEffects();
    return;
  }

  // 检查是否有网站特定设置
  const domain = getCurrentDomain();
  const siteSettings = currentSettings.customSettings[domain];

  // 站点禁用：常见竞品（如 Dark Reader）提供站点列表作为兼容性兜底
  if (siteSettings?.disabled) {
    removeAllEffects();
    return;
  }

  // 获取当前应使用的主题和蓝光过滤设置
  let blueFilter = siteSettings?.blueFilter ?? currentSettings.blueFilter;
  let theme = siteSettings?.theme ?? currentSettings.theme;

  // 只有在开启自动检测且用户未明确选择深色主题时才自动切换
  // 当用户选择深色主题后切换其他主题时，autoDetectDarkMode 会被设为 false
  if (currentSettings.autoDetectDarkMode && theme !== 'dark' && detectDarkMode()) {
    theme = 'dark';
  }

  applyBlueFilter(blueFilter);
  applyTheme(theme);
}

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'UPDATE_SETTINGS') {
    applySettings(message.settings);
    sendResponse({ success: true });
  } else if (message.type === 'GET_DOMAIN') {
    sendResponse({ domain: getCurrentDomain() });
  }
  return true;
});

// 初始化：从存储加载设置
async function init() {
  try {
    const result = await chrome.storage.sync.get('eyeCareSettings');
    if (result.eyeCareSettings) {
      applySettings(result.eyeCareSettings);
    }
  } catch (error) {
    console.error('护眼助手：加载设置失败', error);
  }
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// 监听存储变化
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.eyeCareSettings) {
    applySettings(changes.eyeCareSettings.newValue);
  }
});
