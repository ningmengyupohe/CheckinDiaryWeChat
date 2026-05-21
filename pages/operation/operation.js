// pages/operation/operation.js
const storage = require('../../utils/storage.js');

Page({
  data: {
    projectName: '',
    projectDesc: '',
    targetDaysOptions: [
      { label: '7天', value: 7 },
      { label: '14天', value: 14 },
      { label: '21天', value: 21 },
      { label: '30天', value: 30 },
      { label: '60天', value: 60 },
      { label: '100天', value: 100 },
      { label: '自定义', value: 0 }
    ],
    targetDaysIndex: 3, // 默认选择30天
    showCustomInput: false,
    customTargetDays: '',
    reminderTime: '',
    formId: '',
    templateApplied: false,
    templateName: ''
  },

  onLoad: function(options) {
    console.log('operation页面加载');
    
    // 如果从模板页面跳转过来，有URL参数
    if (options.template) {
      try {
        const templateData = JSON.parse(decodeURIComponent(options.template));
        console.log('接收到URL模板数据:', templateData);
        this.fillFormWithTemplate(templateData);
      } catch (error) {
        console.error('解析URL模板数据失败:', error);
      }
    }
  },

  onShow: function() {
    console.log('operation页面显示');
    
    // 页面显示时检查全局数据中的模板数据
    const app = getApp();
    if (app.globalData && app.globalData.selectedTemplate) {
      console.log('接收到全局模板数据:', app.globalData.selectedTemplate);
      this.fillFormWithTemplate(app.globalData.selectedTemplate);
      // 清空全局数据
      app.globalData.selectedTemplate = null;
    }
  },

  // 使用模板数据填充表单
  fillFormWithTemplate: function(templateData) {
    console.log('填充模板数据:', templateData);
    
    // 根据模板的targetDays找到对应的index
    let targetDaysIndex = 3; // 默认30天
    for (let i = 0; i < this.data.targetDaysOptions.length; i++) {
      if (this.data.targetDaysOptions[i].value === templateData.targetDays) {
        targetDaysIndex = i;
        break;
      }
    }
    
    this.setData({
      projectName: templateData.name || '',
      projectDesc: templateData.description || '',
      reminderTime: templateData.reminderTime || '',
      targetDaysIndex: targetDaysIndex,
      templateApplied: true,
      templateName: templateData.name || '模板'
    });
    
    wx.showToast({
      title: '模板已应用',
      icon: 'success',
      duration: 1500
    });
  },

  onProjectNameInput: function(e) {
    this.setData({
      projectName: e.detail.value
    });
  },

  onProjectDescInput: function(e) {
    this.setData({
      projectDesc: e.detail.value
    });
  },

  onTargetDaysChange: function(e) {
    const index = parseInt(e.detail.value);
    const selectedValue = this.data.targetDaysOptions[index].value;
    
    this.setData({
      targetDaysIndex: index,
      showCustomInput: selectedValue === 0
    });
    
    if (selectedValue !== 0) {
      this.setData({
        customTargetDays: ''
      });
    }
  },

  onCustomTargetDaysInput: function(e) {
    this.setData({
      customTargetDays: e.detail.value
    });
  },

  onReminderTimeChange: function(e) {
    this.setData({
      reminderTime: e.detail.value
    });
  },

  // 跳转到项目模板页面
  goToTemplateList: function() {
    console.log('跳转到project-template页面');
    
    // project-template不是tabBar页面，使用navigateTo
    wx.navigateTo({
      url: '/pages/project-template/project-template',
      success: () => {
        console.log('跳转到模板页面成功');
      },
      fail: (err) => {
        console.error('跳转到模板页面失败:', err);
        wx.showToast({
          title: '跳转失败',
          icon: 'none'
        });
      }
    });
  },

  // 表单提交处理
  saveProject: function(e) {
    console.log('表单提交');
    
    // 获取formId（用于模板消息）
    const formId = e.detail.formId;
    this.setData({ formId });

    // 获取表单数据
    const formData = this.getFormData();
    
    console.log('表单数据:', formData);
    
    // 表单验证
    if (!this.validateForm(formData)) {
      return;
    }

    wx.showLoading({
      title: '保存中...',
    });

    // 保存数据
    setTimeout(() => {
      wx.hideLoading();
      
      // 实际的数据保存逻辑
      const success = this.saveProjectToStorage(formData);
      
      if (success) {
        wx.showToast({
          title: '项目保存成功',
          icon: 'success',
          duration: 2000
        });

        // 清空表单
        this.resetForm();
        
        // 保存成功后跳转到project页面
        setTimeout(() => {
          this.goToProjectPage();
        }, 500);
      } else {
        wx.showToast({
          title: '保存失败，请重试',
          icon: 'none'
        });
      }
    }, 1000);
  },

  // 跳转到projects页面
  goToProjectPage: function() {
    console.log('跳转到projects页面');
    
    // project页面不是tabBar页面，使用redirectTo
    wx.redirectTo({
      url: '/pages/projects/projects',
      success: () => {
        console.log('成功跳转到projects页面');
      },
      fail: (err) => {
        console.error('跳转到projects页面失败:', err);
        
        // 备选方案：使用navigateTo
        wx.navigateTo({
          url: '/pages/projects/projects',
          fail: (err2) => {
            console.error('navigateTo也失败:', err2);
            
            // 最后尝试返回上一页（可能是project-template页面）
            wx.navigateBack({
              delta: 1,
              fail: () => {
                // 如果返回失败，显示提示
                wx.showModal({
                  title: '提示',
                  content: '项目已保存，请手动返回项目页面查看',
                  showCancel: false
                });
              }
            });
          }
        });
      }
    });
  },

  // 获取表单数据
  getFormData: function() {
    let targetDays = this.data.targetDaysOptions[this.data.targetDaysIndex].value;
    
    // 如果选择了自定义，使用自定义的天数
    if (targetDays === 0 && this.data.customTargetDays) {
      targetDays = parseInt(this.data.customTargetDays);
    }

    return {
      name: this.data.projectName.trim(),
      description: this.data.projectDesc.trim(),
      targetDays: targetDays || 30,
      reminderTime: this.data.reminderTime,
      formId: this.data.formId,
      createTime: new Date().toISOString()
    };
  },

  // 表单验证
  validateForm: function(formData) {
    if (!formData.name) {
      wx.showToast({
        title: '请输入项目名称',
        icon: 'none'
      });
      return false;
    }

    if (formData.name.length < 2) {
      wx.showToast({
        title: '项目名称至少2个字符',
        icon: 'none'
      });
      return false;
    }

    if (!formData.targetDays || formData.targetDays <= 0) {
      wx.showToast({
        title: '请设置有效的目标天数',
        icon: 'none'
      });
      return false;
    }

    if (formData.targetDays > 999) {
      wx.showToast({
        title: '目标天数不能超过999天',
        icon: 'none'
      });
      return false;
    }

    return true;
  },

  // 保存项目到本地存储 - 使用storage.js模块
  saveProjectToStorage: function(formData) {
    try {
      console.log('保存项目数据:', formData);
      
      // 生成随机颜色
      const colors = ['#1890ff', '#52c41a', '#fa8c16', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#faad14', '#a0d911', '#2f54eb'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      
      // 生成随机图标
      const icons = ['🏃', '📖', '💧', '🏋️', '🧘', '🎨', '🎼', '✍️', '🌿', '💤'];
      const randomIcon = icons[Math.floor(Math.random() * icons.length)];
      
      // 创建项目对象
      const project = {
        id: Date.now(),
        name: formData.name,
        description: formData.description,
        targetDays: formData.targetDays,
        reminderTime: formData.reminderTime,
        color: randomColor,
        icon: randomIcon,
        status: 'active',
        createTime: new Date().toISOString(),
        stats: {
          consecutiveDays: 0,
          points: 0,
          completionRate: 0,
          totalDays: 0
        }
      };
      
      console.log('要保存的项目对象:', project);
      
      // 使用storage.js模块保存项目
      const saved = storage.createProject(project);
      
      if (saved) {
        console.log('storage.createProject保存成功');
        
        // 验证保存是否成功
        const allProjects = storage.getProjects();
        console.log('当前所有项目数量:', allProjects.length);
        console.log('最新项目:', allProjects[allProjects.length - 1]);
        
        // 触发项目更新事件
        this.triggerProjectUpdate();
        
        return true;
      } else {
        console.error('storage.createProject返回false');
        return false;
      }
    } catch (error) {
      console.error('保存项目失败:', error);
      return false;
    }
  },

  // 触发项目更新事件（用于通知其他页面）
  triggerProjectUpdate: function() {
    // 可以通过事件总线或者全局数据来通知project页面更新
    const app = getApp();
    if (app) {
      if (!app.globalData) {
        app.globalData = {};
      }
      app.globalData.projectsUpdated = true;
      app.globalData.lastUpdateTime = new Date().getTime();
      console.log('设置projectsUpdated为true');
    }
  },

  // 清空表单
  resetForm: function() {
    this.setData({
      projectName: '',
      projectDesc: '',
      targetDaysIndex: 3,
      showCustomInput: false,
      customTargetDays: '',
      reminderTime: '',
      formId: '',
      templateApplied: false,
      templateName: ''
    });
  },

  // 页面返回（可选）
  onBack: function() {
    wx.navigateBack({
      delta: 1
    });
  }
});