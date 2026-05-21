// pages/feedback/feedback.js
Page({
    data: {
      username: '',
      typeIndex: -1,
      content: '',
      files: [],
      isSubmitting: false,
      errors: {
        username: '',
        feedbackType: '',
        content: ''
      },
      
      feedbackTypes: [
        { value: 'bug', name: '功能异常' },
        { value: 'suggestion', name: '功能建议' },
        { value: 'ui', name: '界面问题' },
        { value: 'performance', name: '性能问题' },
        { value: 'other', name: '其他问题' }
      ]
    },
  
    onUsernameInput(e) {
      this.setData({
        username: e.detail.value
      });
      // 实时清除错误提示
      if (this.data.errors.username) {
        this.clearError('username');
      }
    },
  
    onTypeChange(e) {
      const index = parseInt(e.detail.value);
      this.setData({
        typeIndex: index
      });
      // 清除错误提示
      if (this.data.errors.feedbackType) {
        this.clearError('feedbackType');
      }
    },
  
    onContentInput(e) {
      this.setData({
        content: e.detail.value
      });
      // 实时清除错误提示
      if (this.data.errors.content) {
        this.clearError('content');
      }
    },
  
    // 字段失去焦点时验证
    validateField(e) {
      const field = e.currentTarget.dataset.field;
      this.validateFormField(field);
    },
  
    // 验证单个字段
    validateFormField(field) {
      const errors = { ...this.data.errors };
      
      switch (field) {
        case 'username':
          if (!this.data.username || this.data.username.trim().length === 0) {
            errors.username = '请输入用户账号';
          } else {
            errors.username = '';
          }
          break;
          
        case 'feedbackType':
          if (this.data.typeIndex === -1) {
            errors.feedbackType = '请选择反馈类型';
          } else {
            errors.feedbackType = '';
          }
          break;
          
        case 'content':
          if (!this.data.content || this.data.content.trim().length === 0) {
            errors.content = '请输入具体内容';
          } else if (this.data.content.trim().length < 10) {
            errors.content = '具体内容至少需要10个字符';
          } else {
            errors.content = '';
          }
          break;
      }
      
      this.setData({ errors });
      return !errors[field];
    },
  
    // 清除错误提示
    clearError(field) {
      const errors = { ...this.data.errors };
      errors[field] = '';
      this.setData({ errors });
    },
  
    // 验证整个表单
    validateForm() {
      const fields = ['username', 'feedbackType', 'content'];
      let isValid = true;
      
      fields.forEach(field => {
        if (!this.validateFormField(field)) {
          isValid = false;
        }
      });
      
      return isValid;
    },
  
    // 滚动到第一个错误字段
    scrollToFirstError() {
      const fields = ['username', 'feedbackType', 'content'];
      for (let field of fields) {
        if (this.data.errors[field]) {
          // 这里可以添加滚动逻辑，如果需要的话
          console.log('第一个错误字段:', field);
          break;
        }
      }
    },
  
    chooseFile() {
      if (this.data.files.length >= 3) {
        wx.showToast({
          title: '最多上传3个文件',
          icon: 'none'
        });
        return;
      }
  
      wx.chooseMedia({
        count: 3 - this.data.files.length,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          const tempFiles = res.tempFiles.map(file => file.tempFilePath);
          this.setData({
            files: [...this.data.files, ...tempFiles]
          });
        }
      });
    },
  
    removeFile(e) {
      const index = e.currentTarget.dataset.index;
      const files = this.data.files;
      files.splice(index, 1);
      this.setData({ files });
    },
  
    // 表单提交
    submitFeedback(e) {
      console.log('表单提交');
      
      // 防止重复提交
      if (this.data.isSubmitting) {
        return;
      }
  
      // 验证表单
      if (!this.validateForm()) {
        wx.showToast({
          title: '请完善必填项',
          icon: 'none',
          duration: 2000
        });
        this.scrollToFirstError();
        return;
      }
  
      this.setData({ isSubmitting: true });
  
      // 显示加载提示
      wx.showLoading({
        title: '提交中...',
        mask: true
      });
  
      // 准备提交数据
      const formData = {
        username: this.data.username,
        feedbackType: this.data.feedbackTypes[this.data.typeIndex].value,
        feedbackTypeName: this.data.feedbackTypes[this.data.typeIndex].name,
        content: this.data.content,
        files: this.data.files
      };
  
      console.log('提交的数据:', formData);
  
      // 模拟提交到服务器
      setTimeout(() => {
        wx.hideLoading();
        
        // 提交成功
        wx.showToast({
          title: '提交成功',
          icon: 'success',
          duration: 2000
        });
  
        // 重置表单
        setTimeout(() => {
          this.resetForm();
          this.setData({ isSubmitting: false });
          
          // 返回上一页
          wx.navigateBack();
        }, 1500);
  
      }, 2000);
    },
  
    // 重置表单
    resetForm() {
      this.setData({
        username: '',
        typeIndex: -1,
        content: '',
        files: [],
        errors: {
          username: '',
          feedbackType: '',
          content: ''
        }
      });
    }
  });