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
  customSettings: {}
};

// 当前设置
let currentSettings = { ...DEFAULT_SETTINGS };

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
      html {
        filter: url(#blue-light-filter) !important;
      }
      /* 图片和视频保持原色 */
      img, video, canvas, svg:not(#eye-care-svg-filter) {
        filter: none !important;
      }
    `;
  } else {
    style.textContent = '';
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

  style.textContent = `
    /* 背景色替换 */
    html, body {
      background-color: ${theme.background} !important;
    }

    /* 常见容器背景 */
    article, main, section, div, aside, header, footer, nav,
    .container, .content, .wrapper, .main, .article, .post,
    [class*="content"], [class*="article"], [class*="post"],
    [class*="container"], [class*="wrapper"], [class*="main"] {
      background-color: ${theme.background} !important;
    }

    /* 文字颜色 */
    body, p, span, div, article, section, main, li, td, th,
    h1, h2, h3, h4, h5, h6 {
      color: ${theme.text} !important;
    }

    /* 链接颜色 */
    a, a:visited {
      color: ${theme.link} !important;
    }

    /* 输入框 */
    input, textarea, select {
      background-color: ${theme.background} !important;
      color: ${theme.text} !important;
      border-color: ${theme.text}40 !important;
    }

    /* 表格 */
    table, tr, td, th {
      background-color: ${theme.background} !important;
      border-color: ${theme.text}30 !important;
    }

    /* 代码块特殊处理 */
    pre, code {
      background-color: ${themeName === 'dark' ? '#2d2d2d' : theme.background} !important;
      color: ${theme.text} !important;
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

  if (!currentSettings.enabled) {
    removeAllEffects();
    return;
  }

  // 检查是否有网站特定设置
  const domain = getCurrentDomain();
  const siteSettings = currentSettings.customSettings[domain];

  if (siteSettings) {
    applyBlueFilter(siteSettings.blueFilter ?? currentSettings.blueFilter);
    applyTheme(siteSettings.theme ?? currentSettings.theme);
  } else {
    applyBlueFilter(currentSettings.blueFilter);
    applyTheme(currentSettings.theme);
  }
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
