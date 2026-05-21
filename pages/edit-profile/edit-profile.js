// pages/edit-profile/edit-profile.js
Page({
    data: {
      // 当前登录用户信息
      userInfo: {
        nickname: '',
        avatar: '',
        userId: '',
        continuousDays: 0,
        registerTime: ''
      },
      
      // 修改的数据
      newNickname: '',
      avatarUrl: '',
      charCount: 0,
      hasChanges: false,
      
      // 状态
      loading: false,
      uploading: false,
      downloading: false,
      
      // 默认值
      defaultAvatar: '/images/pic1.jpg'
    },
  
    onLoad: function() {
      this.loadCurrentUser();
    },
  
    onShow: function() {
      this.loadCurrentUser();
    },
  
    // 加载当前用户信息
    loadCurrentUser: function() {
      try {
        // 从本地存储获取用户信息
        const userData = wx.getStorageSync('userInfo') || {};
        const continuousDays = wx.getStorageSync('continuousDays') || 0;
        
        // 设置用户信息
        const userInfo = {
          nickname: userData.nickname || '柠檬与薄荷',
          avatar: userData.avatar || '/images/pic1.jpg',
          userId: userData.userId || 'USER_' + Date.now().toString().slice(-6),
          continuousDays: continuousDays,
          registerTime: userData.registerTime || this.formatDate(new Date())
        };
        
        this.setData({
          userInfo: userInfo,
          avatarUrl: userInfo.avatar,
          charCount: userInfo.nickname ? userInfo.nickname.length : 0
        });
        
      } catch (error) {
        console.error('加载用户信息失败:', error);
        // 使用默认值
        const defaultNickname = '柠檬与薄荷';
        this.setData({
          userInfo: {
            nickname: defaultNickname,
            avatar: '/images/pic1.jpg',
            userId: 'USER_' + Date.now().toString().slice(-6),
            continuousDays: 0,
            registerTime: this.formatDate(new Date())
          },
          avatarUrl: '/images/pic1.jpg',
          charCount: defaultNickname.length
        });
      }
    },
  
    // 预览头像
    previewAvatar: function() {
      const avatarUrl = this.data.avatarUrl || this.data.userInfo.avatar || this.data.defaultAvatar;
      wx.previewImage({
        urls: [avatarUrl],
        current: avatarUrl
      });
    },
  
    // 选择头像
    chooseAvatar: function() {
      wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          const tempFilePath = res.tempFilePaths[0];
          
          this.setData({ uploading: true });
          wx.showLoading({ title: '处理中...', mask: true });
          
          setTimeout(() => {
            this.setData({
              avatarUrl: tempFilePath,
              uploading: false
            });
            wx.hideLoading();
            wx.showToast({
              title: '头像已选择',
              icon: 'success',
              duration: 1500
            });
          }, 800);
        },
        fail: (err) => {
          if (err.errMsg.includes('cancel')) return;
          wx.showToast({ title: '选择失败', icon: 'none' });
        }
      });
    },
  
    // 下载头像到相册
    downloadAvatar: function() {
      const { avatarUrl, userInfo, defaultAvatar } = this.data;
      const currentAvatar = avatarUrl || userInfo.avatar || defaultAvatar;
      
      if (!currentAvatar) {
        wx.showToast({ title: '头像地址无效', icon: 'none' });
        return;
      }
      
      this.setData({ downloading: true });
      wx.showLoading({ title: '下载中...', mask: true });
      
      // 如果是网络图片，需要先下载
      if (currentAvatar.startsWith('http')) {
        wx.downloadFile({
          url: currentAvatar,
          success: (res) => {
            if (res.statusCode === 200) {
              this.saveImageToAlbum(res.tempFilePath);
            } else {
              this.handleDownloadError('下载失败');
            }
          },
          fail: () => this.handleDownloadError('下载失败')
        });
      } else {
        // 本地图片直接保存
        this.saveImageToAlbum(currentAvatar);
      }
    },
  
    // 保存图片到相册
    saveImageToAlbum: function(filePath) {
      wx.saveImageToPhotosAlbum({
        filePath: filePath,
        success: () => {
          wx.hideLoading();
          this.setData({ downloading: false });
          wx.showToast({
            title: '已保存到相册',
            icon: 'success',
            duration: 2000
          });
        },
        fail: (err) => {
          this.handleSaveError(err);
        }
      });
    },
  
    // 处理保存错误
    handleSaveError: function(err) {
      wx.hideLoading();
      this.setData({ downloading: false });
      
      if (err.errMsg.includes('auth deny')) {
        wx.showModal({
          title: '权限申请',
          content: '需要相册权限才能保存图片',
          confirmText: '去设置',
          success: (res) => {
            if (res.confirm) wx.openSetting();
          }
        });
      } else {
        wx.showToast({ title: '保存失败', icon: 'none' });
      }
    },
  
    // 处理下载错误
    handleDownloadError: function(msg) {
      wx.hideLoading();
      this.setData({ downloading: false });
      wx.showToast({ title: msg, icon: 'none' });
    },
  
    // 重置头像
    resetAvatar: function() {
      const { userInfo } = this.data;
      this.setData({
        avatarUrl: userInfo.avatar
      });
      wx.showToast({ title: '已恢复原头像', icon: 'success' });
    },
  
    // 昵称输入处理
    onNicknameChange: function(e) {
      const value = e.detail.value || '';
      const charCount = value.length;
      const hasChanges = value !== this.data.userInfo.nickname;
      
      this.setData({
        newNickname: value,
        charCount: charCount,
        hasChanges: hasChanges
      });
    },
  
    // 保存资料
    saveProfile: function() {
      const { newNickname, avatarUrl, userInfo, loading } = this.data;
      
      if (loading) return;
      
      // 确定要保存的昵称（如果用户没有输入新昵称，使用原昵称）
      const finalNickname = newNickname ? newNickname.trim() : userInfo.nickname;
      
      // 验证昵称
      if (!finalNickname || finalNickname.length === 0) {
        wx.showToast({ title: '昵称不能为空', icon: 'none' });
        return;
      }
      
      if (finalNickname.length < 2) {
        wx.showToast({ title: '昵称至少2个字符', icon: 'none' });
        return;
      }
      
      if (finalNickname.length > 20) {
        wx.showToast({ title: '昵称不能超过20个字符', icon: 'none' });
        return;
      }
      
      this.setData({ loading: true });
      wx.showLoading({ title: '保存中...', mask: true });
      
      setTimeout(() => {
        try {
          // 更新用户信息
          const updatedUserInfo = {
            nickname: finalNickname,
            avatar: avatarUrl || userInfo.avatar,
            userId: userInfo.userId,
            continuousDays: userInfo.continuousDays,
            registerTime: userInfo.registerTime
          };
          
          // 保存到本地存储
          wx.setStorageSync('userInfo', {
            nickname: updatedUserInfo.nickname,
            avatar: updatedUserInfo.avatar,
            userId: updatedUserInfo.userId,
            stats: {
              projects: 28,
              completionRate: '96%',
              badges: 15
            }
          });
          
          // 更新页面数据
          this.setData({
            userInfo: updatedUserInfo,
            loading: false,
            hasChanges: false,
            charCount: finalNickname.length
          });
          
          wx.hideLoading();
          
          wx.showToast({
            title: '保存成功',
            icon: 'success',
            duration: 1500,
            success: () => {
              setTimeout(() => {
                wx.navigateBack();
              }, 1500);
            }
          });
          
        } catch (error) {
          console.error('保存失败:', error);
          wx.hideLoading();
          this.setData({ loading: false });
          wx.showToast({ title: '保存失败', icon: 'none' });
        }
      }, 1000);
    },
  
    // 重置表单
    resetForm: function() {
      const { newNickname, avatarUrl, userInfo } = this.data;
      
      if (!newNickname && avatarUrl === userInfo.avatar) {
        wx.showToast({ title: '没有可重置的修改', icon: 'none' });
        return;
      }
      
      wx.showModal({
        title: '重置确认',
        content: '确定要重置所有修改吗？',
        success: (res) => {
          if (res.confirm) {
            this.setData({
              newNickname: '',
              avatarUrl: userInfo.avatar,
              hasChanges: false,
              charCount: userInfo.nickname ? userInfo.nickname.length : 0
            });
            wx.showToast({ title: '已重置', icon: 'success' });
          }
        }
      });
    },
  
    // 返回上一页
    goBack: function() {
      const { newNickname, avatarUrl, userInfo, hasChanges } = this.data;
      
      if (hasChanges || (avatarUrl && avatarUrl !== userInfo.avatar)) {
        wx.showModal({
          title: '提示',
          content: '有未保存的修改，确定要返回吗？',
          confirmText: '确定',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) {
              wx.navigateBack();
            }
          }
        });
      } else {
        wx.navigateBack();
      }
    },
  
    // 格式化日期
    formatDate: function(date) {
      const d = new Date(date);
      const year = d.getFullYear();
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  });