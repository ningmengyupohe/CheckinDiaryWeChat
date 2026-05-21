// app.js
App({
    onLaunch: function () {
      // 展示本地存储能力
      const logs = wx.getStorageSync('logs') || []
      logs.unshift(Date.now())
      wx.setStorageSync('logs', logs)
  
      // 初始化用户信息
      this.initUserInfo();
      
      // 初始化天气API配置
      this.initWeatherApi();
      
      // 检查网络状态
      this.checkNetworkStatus();
      
      // 登录
      wx.login({
        success: res => {
          console.log('微信登录成功，code:', res.code);
          // 这里可以将code发送到服务器获取openid和session_key
          this.globalData.loginCode = res.code;
        },
        fail: err => {
          console.error('微信登录失败:', err);
        }
      });
      
      // 获取系统信息
      this.getSystemInfo();
      
      // 检查更新
      this.checkUpdate();
    },
  
    onShow: function(options) {
      console.log('小程序启动参数:', options);
      // 处理场景值
      this.handleScene(options.scene);
    },
  
    onHide: function() {
      console.log('小程序进入后台');
    },
  
    onError: function(msg) {
      console.error('小程序错误:', msg);
      // 可以在这里上报错误日志
    },
  
    // 初始化用户信息
    initUserInfo: function() {
      // 尝试从本地存储获取用户信息
      const userInfo = wx.getStorageSync('userInfo');
      if (userInfo) {
        this.globalData.userInfo = userInfo;
        console.log('从本地存储加载用户信息:', userInfo);
      } else {
        // 如果没有用户信息，尝试获取用户授权
        this.checkUserInfoAuth();
      }
    },
  
    // 检查用户信息授权
    checkUserInfoAuth: function() {
      wx.getSetting({
        success: res => {
          if (res.authSetting['scope.userInfo']) {
            // 已经授权，可以直接获取用户信息
            wx.getUserInfo({
              success: res => {
                const userInfo = res.userInfo;
                this.globalData.userInfo = userInfo;
                wx.setStorageSync('userInfo', userInfo);
                console.log('获取用户信息成功:', userInfo);
              },
              fail: err => {
                console.error('获取用户信息失败:', err);
              }
            });
          } else {
            console.log('用户未授权用户信息');
          }
        }
      });
    },
  
    // 初始化天气API配置
    initWeatherApi: function() {
      this.globalData.weatherApi = {
        baseUrl: 'https://v0.yiketianqi.com/api',
        appid: '57267117',
        appsecret: 'sNr75DyK',
        version: 'v9',
        // 备用API配置
        backupApis: [
          {
            name: '和风天气',
            url: 'https://devapi.qweather.com/v7',
            key: '' // 需要申请
          }
        ]
      };
      
      console.log('天气API配置已初始化');
    },
  
    // 检查网络状态
    checkNetworkStatus: function() {
      wx.getNetworkType({
        success: res => {
          const networkType = res.networkType;
          this.globalData.networkType = networkType;
          console.log('当前网络类型:', networkType);
          
          // 监听网络状态变化
          wx.onNetworkStatusChange((res) => {
            console.log('网络状态变化:', res);
            this.globalData.networkType = res.networkType;
            this.globalData.isConnected = res.isConnected;
            
            if (!res.isConnected) {
              wx.showToast({
                title: '网络已断开',
                icon: 'none',
                duration: 2000
              });
            }
          });
        },
        fail: err => {
          console.error('获取网络状态失败:', err);
        }
      });
    },
  
    // 获取系统信息
    getSystemInfo: function() {
      try {
        const systemInfo = wx.getSystemInfoSync();
        this.globalData.systemInfo = systemInfo;
        console.log('系统信息:', systemInfo);
        
        // 设置全局状态栏高度
        this.globalData.statusBarHeight = systemInfo.statusBarHeight;
        this.globalData.navBarHeight = systemInfo.statusBarHeight + 44; // 44是导航栏标准高度
      } catch (e) {
        console.error('获取系统信息失败:', e);
      }
    },
  
    // 检查更新
    checkUpdate: function() {
      if (wx.canIUse('getUpdateManager')) {
        const updateManager = wx.getUpdateManager();
        
        updateManager.onCheckForUpdate(function(res) {
          // 请求完新版本信息的回调
          console.log('检查更新结果:', res.hasUpdate);
        });
        
        updateManager.onUpdateReady(function() {
          wx.showModal({
            title: '更新提示',
            content: '新版本已经准备好，是否重启应用？',
            success: function(res) {
              if (res.confirm) {
                // 新的版本已经下载好，调用 applyUpdate 应用新版本并重启
                updateManager.applyUpdate();
              }
            }
          });
        });
        
        updateManager.onUpdateFailed(function() {
          // 新的版本下载失败
          wx.showToast({
            title: '更新失败',
            icon: 'none'
          });
        });
      } else {
        // 如果希望用户在最新版本的客户端上体验您的小程序，可以这样子提示
        wx.showModal({
          title: '提示',
          content: '当前微信版本过低，无法使用更新功能，请升级到最新微信版本后重试。'
        });
      }
    },
  
    // 处理场景值
    handleScene: function(scene) {
      const sceneMap = {
        1001: '发现栏小程序主入口',
        1005: '顶部搜索框的搜索结果页',
        1006: '发现栏小程序主入口搜索框的搜索结果页',
        1007: '单人聊天会话中的小程序消息卡片',
        1008: '群聊会话中的小程序消息卡片',
        1011: '扫描二维码',
        1012: '长按图片识别二维码',
        1013: '手机相册选取二维码',
        1014: '小程序模板消息',
        1017: '前往体验版的入口页',
        1019: '微信钱包',
        1020: '公众号 profile 页相关小程序列表',
        1022: '聊天顶部置顶小程序入口',
        1023: '安卓系统桌面图标',
        1024: '小程序 profile 页',
        1025: '扫描一维码',
        1026: '附近小程序列表',
        1027: '顶部搜索框搜索结果页「使用过的小程序」列表',
        1028: '我的卡包',
        1029: '卡券详情页',
        1030: '自动化测试下打开小程序',
        1031: '长按图片识别一维码',
        1032: '手机相册选取一维码',
        1034: '微信支付完成页',
        1035: '公众号自定义菜单',
        1036: 'App 分享消息卡片',
        1037: '小程序打开小程序',
        1038: '从另一个小程序返回',
        1039: '摇电视',
        1042: '添加好友搜索框的搜索结果页',
        1043: '公众号模板消息',
        1044: '带 shareTicket 的小程序消息卡片',
        1047: '扫描小程序码',
        1048: '长按图片识别小程序码',
        1049: '手机相册选取小程序码',
        1052: '卡券的适用门店列表',
        1053: '搜一搜的结果页',
        1054: '顶部搜索框小程序快捷入口',
        1056: '音乐播放器菜单',
        1057: '钱包中的银行卡详情页',
        1058: '公众号文章',
        1059: '体验版小程序绑定邀请页',
        1060: '微信支付完成页',
        1064: '微信连Wi-Fi状态栏',
        1065: 'URL scheme',
        1067: '公众号文章广告',
        1068: '附近小程序列表广告',
        1069: '移动应用',
        1071: '钱包中的银行卡列表页',
        1072: '二维码收款页面',
        1073: '客服消息列表下发的小程序消息卡片',
        1074: '公众号会话下发的小程序消息卡片',
        1077: '摇周边',
        1078: '连Wi-Fi成功页',
        1079: '微信游戏中心',
        1081: '客服消息下发的文字链',
        1082: '公众号会话下发的文字链',
        1084: '朋友圈广告',
        1089: '微信聊天主界面下拉',
        1090: '长按小程序右上角菜单唤出最近使用历史',
        1091: '公众号文章商品卡片',
        1092: '城市服务入口',
        1095: '小程序广告组件',
        1096: '聊天记录',
        1097: '微信支付签约页',
        1099: '页面内嵌插件',
        1102: '公众号 profile 页服务预览',
        1103: '发现栏小程序主入口，「我的小程序」列表',
        1104: '微信聊天主界面下拉，「我的小程序」栏',
        1106: '聊天主界面下拉，从顶部搜索结果页，打开小程序',
        1107: '订阅消息',
        1113: '安卓手机负一屏卡片',
        1114: '安卓手机侧边栏',
        1124: '扫「一物一码」打开小程序',
        1125: '长按图片识别「一物一码」',
        1126: '扫描快递单号打开小程序',
        1129: '微信爬虫访问'
      };
      
      const sceneDesc = sceneMap[scene] || '未知场景';
      console.log('启动场景:', scene, '-', sceneDesc);
      this.globalData.launchScene = {
        scene: scene,
        desc: sceneDesc
      };
    },
  
    // 全局方法：显示加载提示
    showLoading: function(title = '加载中') {
      wx.showLoading({
        title: title,
        mask: true
      });
    },
  
    // 全局方法：隐藏加载提示
    hideLoading: function() {
      wx.hideLoading();
    },
  
    // 全局方法：显示成功提示
    showSuccess: function(title = '操作成功') {
      wx.showToast({
        title: title,
        icon: 'success',
        duration: 2000
      });
    },
  
    // 全局方法：显示错误提示
    showError: function(title = '操作失败') {
      wx.showToast({
        title: title,
        icon: 'error',
        duration: 2000
      });
    },
  
    // 全局方法：显示确认对话框
    showConfirm: function(options) {
      return new Promise((resolve, reject) => {
        wx.showModal({
          title: options.title || '提示',
          content: options.content || '',
          showCancel: options.showCancel !== false,
          cancelText: options.cancelText || '取消',
          confirmText: options.confirmText || '确定',
          success: res => {
            if (res.confirm) {
              resolve(true);
            } else {
              resolve(false);
            }
          },
          fail: err => {
            reject(err);
          }
        });
      });
    },
  
    // 全局方法：获取天气数据
    getWeatherData: function(city, successCallback, failCallback) {
      const api = this.globalData.weatherApi;
      
      wx.request({
        url: api.baseUrl,
        data: {
          version: api.version,
          appid: api.appid,
          appsecret: api.appsecret,
          city: city,
          vue: 1
        },
        success: res => {
          if (res.statusCode === 200 && res.data && res.data.data) {
            successCallback && successCallback(res.data);
          } else {
            failCallback && failCallback(new Error('天气数据获取失败'));
          }
        },
        fail: err => {
          failCallback && failCallback(err);
        }
      });
    },
  
    // 全局数据
    globalData: {
      // 用户信息
      userInfo: null,
      loginCode: null,
      
      // 系统信息
      systemInfo: null,
      statusBarHeight: 20,
      navBarHeight: 64,
      
      // 网络状态
      networkType: 'unknown',
      isConnected: true,
      
      // 启动场景
      launchScene: null,
      
      // 打卡数据
      checkinData: {
        totalDays: 28,
        currentStreak: 7,
        completedTasks: 12,
        lastCheckinDate: null,
        todayTasks: []
      },
      
      // 天气API配置
      weatherApi: null,
      
      // 应用配置
      appConfig: {
        version: '1.0.0',
        theme: 'light', // light, dark
        language: 'zh_CN',
        notificationEnabled: true,
        autoPlayMusic: false,
        defaultCity: '北京'
      },
      
      // 缓存数据
      cache: {
        weatherData: {},
        lastUpdateTime: 0,
        cacheDuration: 1800000 // 30分钟缓存
      },
      
      // 统计信息
      statistics: {
        launchCount: 0,
        lastLaunchTime: null,
        weatherQueryCount: 0
      }
    }
  });