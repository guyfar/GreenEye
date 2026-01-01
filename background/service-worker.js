/**
 * 护眼阅读助手 - Service Worker
 * 后台服务脚本
 */

// 扩展安装/更新时初始化
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // 首次安装，设置默认配置
    const defaultSettings = {
      enabled: false,
      theme: 'green',
      blueFilter: 30,
      customSettings: {}
    };

    await chrome.storage.sync.set({ eyeCareSettings: defaultSettings });
    console.log('护眼阅读助手已安装，默认配置已初始化');
  }
});

// 监听标签页更新，确保 content script 正确加载
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // 只在页面加载完成时处理
  if (changeInfo.status !== 'complete') return;

  // 跳过特殊页面
  if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
    return;
  }

  try {
    // 获取当前设置
    const result = await chrome.storage.sync.get('eyeCareSettings');
    if (result.eyeCareSettings?.enabled) {
      // 向标签页发送设置更新
      await chrome.tabs.sendMessage(tabId, {
        type: 'UPDATE_SETTINGS',
        settings: result.eyeCareSettings
      });
    }
  } catch (error) {
    // 某些页面可能无法接收消息，忽略错误
  }
});

// 处理来自 content script 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_SETTINGS') {
    chrome.storage.sync.get('eyeCareSettings').then(result => {
      sendResponse(result.eyeCareSettings || null);
    });
    return true; // 保持消息通道开放
  }
});
