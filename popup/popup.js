/**
 * 护眼阅读助手 - Popup 脚本
 */

// 默认设置
const DEFAULT_SETTINGS = {
  enabled: false,
  theme: 'green',
  blueFilter: 30,
  customSettings: {},
  autoDetectDarkMode: true
};

// 推荐的最佳护眼配置
const RECOMMENDED_SETTINGS = {
  enabled: true,
  theme: 'green',
  blueFilter: 30,
  autoDetectDarkMode: true
};

// 当前设置
let currentSettings = { ...DEFAULT_SETTINGS };
let currentDomain = '';

// 防抖定时器
let saveDebounceTimer = null;

// 防抖函数：延迟保存，避免频繁写入
function debounceSave(delay = 500) {
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
  }
  saveDebounceTimer = setTimeout(() => {
    saveSettings();
  }, delay);
}

// DOM 元素
const elements = {
  mainSwitch: null,
  blueFilter: null,
  blueFilterValue: null,
  blueFilterSection: null,
  themeSection: null,
  themeBtns: null,
  currentDomain: null,
  toggleSiteBtn: null,
  saveSiteBtn: null,
  siteDisabledHint: null,
  siteSavedHint: null,
  siteMemorySection: null,
  resetBtn: null
};

// 初始化 DOM 元素引用
function initElements() {
  elements.mainSwitch = document.getElementById('mainSwitch');
  elements.blueFilter = document.getElementById('blueFilter');
  elements.blueFilterValue = document.getElementById('blueFilterValue');
  elements.blueFilterSection = document.getElementById('blueFilterSection');
  elements.themeSection = document.getElementById('themeSection');
  elements.themeBtns = document.querySelectorAll('.theme-btn');
  elements.currentDomain = document.getElementById('currentDomain');
  elements.toggleSiteBtn = document.getElementById('toggleSiteBtn');
  elements.saveSiteBtn = document.getElementById('saveSiteBtn');
  elements.siteDisabledHint = document.getElementById('siteDisabledHint');
  elements.siteSavedHint = document.getElementById('siteSavedHint');
  elements.siteMemorySection = document.getElementById('siteMemorySection');
  elements.resetBtn = document.getElementById('resetBtn');
}

function hasSitePreferences(siteSettings) {
  if (!siteSettings || typeof siteSettings !== 'object') return false;
  return Object.prototype.hasOwnProperty.call(siteSettings, 'theme') ||
    Object.prototype.hasOwnProperty.call(siteSettings, 'blueFilter');
}

// 更新 UI 显示
function updateUI() {
  // 主开关
  elements.mainSwitch.checked = currentSettings.enabled;

  // 获取当前网站特定设置或全局设置
  const siteSettings = currentSettings.customSettings[currentDomain];
  const isSiteDisabled = siteSettings?.disabled === true;
  const hasSiteSettings = hasSitePreferences(siteSettings);

  const activeTheme = siteSettings?.theme ?? currentSettings.theme;
  const activeBlueFilter = siteSettings?.blueFilter ?? currentSettings.blueFilter;

  // 蓝光过滤
  elements.blueFilter.value = activeBlueFilter;
  elements.blueFilterValue.textContent = `${activeBlueFilter}%`;

  // 主题按钮
  elements.themeBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === activeTheme);
  });

  // 控制面板启用/禁用状态
  const isGlobalDisabled = !currentSettings.enabled;
  const isControlDisabled = isGlobalDisabled || isSiteDisabled;
  elements.blueFilterSection.classList.toggle('disabled', isControlDisabled);
  elements.themeSection.classList.toggle('disabled', isControlDisabled);
  elements.siteMemorySection.classList.toggle('disabled', isGlobalDisabled);

  // 网站记忆状态
  elements.saveSiteBtn.classList.toggle('saved', hasSiteSettings);
  elements.saveSiteBtn.textContent = hasSiteSettings ? '已保存' : '记住设置';
  elements.siteSavedHint.classList.toggle('show', hasSiteSettings);

  // 网站禁用状态
  if (elements.toggleSiteBtn) {
    elements.toggleSiteBtn.classList.toggle('site-disabled', isSiteDisabled);
    elements.toggleSiteBtn.textContent = isSiteDisabled ? '启用此站' : '此站禁用';
    elements.siteDisabledHint.classList.toggle('show', isSiteDisabled);
  }
}

// 保存设置到存储
async function saveSettings() {
  try {
    await chrome.storage.sync.set({ eyeCareSettings: currentSettings });
    // 通知当前标签页更新
    await notifyContentScript();
  } catch (error) {
    console.error('保存设置失败:', error);
  }
}

// 通知 content script 更新
async function notifyContentScript() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.tabs.sendMessage(tab.id, {
        type: 'UPDATE_SETTINGS',
        settings: currentSettings
      });
    }
  } catch (error) {
    // 某些页面可能无法注入 content script，忽略错误
    console.log('无法通知页面更新:', error.message);
  }
}

// 获取当前标签页域名
async function getCurrentTabDomain() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) {
      const url = new URL(tab.url);
      return url.hostname;
    }
  } catch (error) {
    console.error('获取域名失败:', error);
  }
  return '';
}

// 事件处理：主开关
function handleMainSwitch() {
  currentSettings.enabled = elements.mainSwitch.checked;
  updateUI();
  saveSettings();
}

// 事件处理：蓝光过滤（实时预览）
function handleBlueFilterInput() {
  const value = parseInt(elements.blueFilter.value);
  currentSettings.blueFilter = value;
  elements.blueFilterValue.textContent = `${value}%`;

  // 如果当前网站有特定设置，也更新它
  const siteSettings = currentSettings.customSettings[currentDomain];
  if (hasSitePreferences(siteSettings)) {
    currentSettings.customSettings[currentDomain].blueFilter = value;
  }

  // 实时通知页面更新（预览效果）
  notifyContentScript();

  // 延迟保存到存储（防止频繁写入）
  debounceSave(300);
}

// 事件处理：主题选择
function handleThemeSelect(theme) {
  currentSettings.theme = theme;
  // 用户手动选择主题后，禁用自动深色模式检测
  // 这样用户从深色主题切换到其他主题时不会被自动覆盖
  currentSettings.autoDetectDarkMode = false;

  // 如果当前网站有特定设置，也更新它
  const siteSettings = currentSettings.customSettings[currentDomain];
  if (hasSitePreferences(siteSettings)) {
    currentSettings.customSettings[currentDomain].theme = theme;
  }

  updateUI();
  saveSettings();
}

// 事件处理：重置为推荐设置
function handleReset() {
  // 保留自定义网站设置，只重置全局设置
  const customSettings = currentSettings.customSettings;
  currentSettings = { ...RECOMMENDED_SETTINGS, customSettings };

  // 如果当前网站有特定设置，也删除它以使用全局设置
  if (currentSettings.customSettings[currentDomain]) {
    delete currentSettings.customSettings[currentDomain];
  }

  updateUI();
  saveSettings();
}

// 事件处理：保存网站设置
function handleSaveSite() {
  if (!currentDomain) return;

  const existing = currentSettings.customSettings[currentDomain];
  const siteSettings = (existing && typeof existing === 'object' && !Array.isArray(existing)) ? { ...existing } : {};
  const hasPrefs = hasSitePreferences(siteSettings);

  if (hasPrefs) {
    // 已有偏好设置，清除偏好（保留 disabled 标记）
    delete siteSettings.theme;
    delete siteSettings.blueFilter;
    if (Object.keys(siteSettings).length === 0) {
      delete currentSettings.customSettings[currentDomain];
    } else {
      currentSettings.customSettings[currentDomain] = siteSettings;
    }
  } else {
    // 保存当前偏好到网站（保留 disabled 标记）
    currentSettings.customSettings[currentDomain] = {
      ...siteSettings,
      theme: currentSettings.theme,
      blueFilter: currentSettings.blueFilter
    };
  }

  updateUI();
  saveSettings();
}

// 事件处理：在此站点禁用/启用
function handleToggleSite() {
  if (!currentDomain) return;

  const existing = currentSettings.customSettings[currentDomain];
  const siteSettings = (existing && typeof existing === 'object' && !Array.isArray(existing)) ? { ...existing } : {};

  if (siteSettings.disabled) {
    delete siteSettings.disabled;
  } else {
    siteSettings.disabled = true;
  }

  if (Object.keys(siteSettings).length === 0) {
    delete currentSettings.customSettings[currentDomain];
  } else {
    currentSettings.customSettings[currentDomain] = siteSettings;
  }

  updateUI();
  saveSettings();
}

// 绑定事件
function bindEvents() {
  elements.mainSwitch.addEventListener('change', handleMainSwitch);
  elements.blueFilter.addEventListener('input', handleBlueFilterInput);

  elements.themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      handleThemeSelect(btn.dataset.theme);
    });
  });

  if (elements.toggleSiteBtn) {
    elements.toggleSiteBtn.addEventListener('click', handleToggleSite);
  }

  elements.saveSiteBtn.addEventListener('click', handleSaveSite);

  // 重置按钮
  if (elements.resetBtn) {
    elements.resetBtn.addEventListener('click', handleReset);
  }
}

// 加载设置
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get('eyeCareSettings');
    if (result.eyeCareSettings) {
      currentSettings = { ...DEFAULT_SETTINGS, ...result.eyeCareSettings };
    }
    if (!currentSettings.customSettings || typeof currentSettings.customSettings !== 'object' || Array.isArray(currentSettings.customSettings)) {
      currentSettings.customSettings = {};
    }
  } catch (error) {
    console.error('加载设置失败:', error);
  }
}

// 初始化
async function init() {
  initElements();

  // 加载设置
  await loadSettings();

  // 获取当前域名
  currentDomain = await getCurrentTabDomain();
  elements.currentDomain.textContent = currentDomain || '无法获取';

  // 更新 UI
  updateUI();

  // 绑定事件
  bindEvents();
}

// 启动
document.addEventListener('DOMContentLoaded', init);
