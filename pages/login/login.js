// pages/login/login.js
Page({
    data: {
      loading: false,
      loadingText: '正在登录中...',
      agreed: true // 默认同意协议
    },
  
    onLoad: function(options) {
      // 如果有回调页面，保存起来
      if (options.redirect) {
        wx.setStorageSync('loginRedirect', options.redirect);
      }
      
      // 检查是否已经登录
      this.checkLoginStatus();
    },
  
    // 检查登录状态
    checkLoginStatus: function() {
      const userInfo = wx.getStorageSync('userInfo') || {};
      if (userInfo && userInfo.id && userInfo.nickname !== '请登录') {
        // 已经登录，直接跳转到个人页面
        setTimeout(() => {
          this.redirectAfterLogin();
        }, 500);
      }
    },
  
    // 微信登录
    loginWithWeChat: function() {
      if (!this.data.agreed) {
        wx.showToast({
          title: '请同意用户协议',
          icon: 'none'
        });
        return;
      }
  
      this.setData({ 
        loading: true,
        loadingText: '正在获取用户信息...' 
      });
  
      // 第一步：获取用户信息
      wx.getUserProfile({
        desc: '用于完善用户资料',
        success: (res) => {
          const userInfo = res.userInfo;
          this.setData({ loadingText: '正在登录...' });
          this.handleWeChatLogin(userInfo);
        },
        fail: (err) => {
          console.error('获取用户信息失败:', err);
          this.setData({ loading: false });
          
          wx.showModal({
            title: '授权提示',
            content: '需要获取您的用户信息才能使用完整功能，是否授权？',
            confirmText: '去授权',
            cancelText: '取消',
            success: (res) => {
              if (res.confirm) {
                // 引导用户去设置页面开启权限
                wx.openSetting({
                  success: (settingRes) => {
                    if (settingRes.authSetting['scope.userInfo']) {
                      this.loginWithWeChat();
                    }
                  }
                });
              }
            }
          });
        }
      });
    },
  
    // 处理微信登录
    handleWeChatLogin: function(userInfo) {
      // 获取或创建用户ID
      let userId = wx.getStorageSync('wxUserId');
      if (!userId) {
        userId = 'wx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        wx.setStorageSync('wxUserId', userId);
      }
  
      // 获取用户昵称历史记录
      const nicknameHistory = wx.getStorageSync('nicknameHistory') || {};
      
      // 检查是否已经有这个微信用户的记录
      let finalNickname = userInfo.nickName;
      if (nicknameHistory[userId]) {
        // 如果已经有记录，使用之前的昵称
        finalNickname = nicknameHistory[userId];
      } else {
        // 保存昵称历史
        nicknameHistory[userId] = finalNickname;
        wx.setStorageSync('nicknameHistory', nicknameHistory);
      }
  
      // 构建用户数据
      const userData = {
        id: userId,
        nickname: finalNickname,
        avatar: userInfo.avatarUrl || '/images/default-avatar.png',
        gender: userInfo.gender,
        country: userInfo.country,
        province: userInfo.province,
        city: userInfo.city,
        loginType: 'wechat',
        loginTime: new Date().toISOString(),
        lastLoginTime: new Date().toISOString()
      };
  
      // 保存用户信息
      wx.setStorageSync('userInfo', userData);
  
      // 更新登录历史
      const loginHistory = wx.getStorageSync('loginHistory') || [];
      loginHistory.unshift({
        userId: userId,
        loginTime: new Date().toISOString(),
        type: 'wechat'
      });
      
      // 只保留最近10条记录
      if (loginHistory.length > 10) {
        loginHistory.pop();
      }
      wx.setStorageSync('loginHistory', loginHistory);
  
      // 登录成功
      this.handleLoginSuccess(userData);
    },
  
    // 处理登录成功
    handleLoginSuccess: function(userData) {
      wx.showToast({
        title: '登录成功',
        icon: 'success',
        duration: 2000
      });
  
      // 延迟跳转
      setTimeout(() => {
        this.setData({ loading: false });
        this.redirectAfterLogin();
      }, 1500);
    },
  
    // 登录后跳转
    redirectAfterLogin: function() {
      const redirect = wx.getStorageSync('loginRedirect') || '/pages/profile/profile';
      wx.removeStorageSync('loginRedirect');
  
      if (redirect === 'back') {
        wx.navigateBack();
      } else {
        // 检查是否是tab页面
        const tabPages = ['/pages/panel/panel', '/pages/operation/operation', '/pages/profile/profile'];
        if (tabPages.includes(redirect)) {
          wx.switchTab({ url: redirect });
        } else {
          wx.redirectTo({ url: redirect });
        }
      }
    },
  
    // 显示用户协议
    showUserAgreement: function() {
      wx.showModal({
        title: '用户协议',
        content: `欢迎使用习惯养成打卡小程序！
  
  一、服务条款
  1. 本小程序为用户提供习惯养成打卡服务。
  2. 用户需遵守相关法律法规和本协议。
  
  二、微信登录说明
  1. 使用微信登录获取您的公开信息（昵称、头像）。
  2. 这些信息仅用于在应用内显示您的身份。
  
  三、数据说明
  1. 所有打卡数据保存在您的设备本地。
  2. 更换设备或清除缓存会导致数据丢失。
  3. 您可以使用导出功能备份数据。
  
  四、隐私保护
  1. 我们不会收集您的个人敏感信息。
  2. 所有数据仅在您的设备上处理。
  
  五、免责声明
  1. 本小程序为个人习惯管理工具。
  2. 请合理使用，避免过度沉迷。
  
  感谢您的使用！如有问题请联系：support@habit.com`,
        showCancel: false,
        confirmText: '同意并继续'
      });
    },
  
    // 显示隐私政策
    showPrivacyPolicy: function() {
      wx.showModal({
        title: '隐私政策',
        content: `隐私政策
  
  一、信息收集
  1. 通过微信登录获取您的公开信息（昵称、头像）
  2. 这些信息仅用于在应用内显示您的身份
  
  二、数据存储
  1. 所有打卡数据存储在您的设备本地
  2. 我们不会上传您的个人数据到服务器
  3. 您可以随时导出或清除本地数据
  
  三、信息使用
  1. 仅在应用内展示您的用户信息
  2. 不用于任何商业推广或第三方共享
  
  四、您的权利
  1. 随时可以清除本地数据
  2. 可以通过重新登录更新用户信息
  
  五、数据安全
  1. 所有数据在您的设备本地存储
  2. 建议定期使用导出功能备份重要数据
  
  六、联系与反馈
  如有任何隐私相关问题，请通过以下方式联系我们：
  邮箱：privacy@habit.com
  
  我们会认真对待您的隐私问题并尽快回复。`,
        showCancel: false,
        confirmText: '明白了'
      });
    },
  
    // 页面分享
    onShareAppMessage: function() {
      return {
        title: '习惯养成打卡',
        path: '/pages/login/login',
        imageUrl: '/images/share-cover.jpg'
      };
    }
  });