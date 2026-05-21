// pages/project/project.js
const storage = require('../../utils/storage.js');

Page({
  data: {
    projects: [],
    editingProject: null,
    showEditModal: false,
    loading: false,
    error: null
  },

  onLoad: function(options) {
    console.log('project页面加载');
    // 初始化打卡记录存储
    this.initStorage();
    this.loadProjects();
  },

  onShow: function() {
    console.log('project页面显示');
    // 检查全局数据是否需要更新
    const app = getApp();
    if (app.globalData && app.globalData.projectsUpdated) {
      app.globalData.projectsUpdated = false;
      this.loadProjects();
      wx.showToast({
        title: '数据已更新',
        icon: 'success',
        duration: 1000
      });
    } else {
      this.loadProjects();
    }
  },

  // 初始化存储
  initStorage: function() {
    try {
      // 初始化打卡记录存储
      storage.initCheckinRecords();
      
      // 检查存储是否正常
      const projects = storage.getProjects();
      console.log('存储初始化完成，项目数:', projects.length);
    } catch (error) {
      console.error('存储初始化失败:', error);
      this.setData({
        error: '存储初始化失败，请重启小程序'
      });
    }
  },

  // 加载项目列表
  loadProjects: function() {
    this.setData({
      loading: true,
      error: null
    });

    try {
      console.log('开始加载项目列表...');
      const projects = storage.getProjects();
      console.log('获取到原始项目数据:', projects.length, '个');
      
      // 如果没有任何项目，直接设置空数组
      if (!projects || projects.length === 0) {
        console.log('没有找到项目数据');
        this.setData({
          projects: [],
          loading: false
        });
        return;
      }
      
      // 获取每个项目的实时统计数据
      const projectsWithStats = projects.map(project => {
        try {
          if (!project || typeof project !== 'object') {
            console.error('项目数据格式错误:', project);
            return {
              id: Date.now(),
              name: '数据错误',
              description: '项目数据格式错误',
              targetDays: 0,
              color: '#f5222d',
              icon: '❌',
              stats: {
                consecutiveDays: 0,
                points: 0,
                completionRate: 0,
                totalDays: 0,
                targetDays: 0
              }
            };
          }
          
          console.log(`处理项目: ${project.name || '未命名项目'}, ID: ${project.id}`);
          
          // 确保项目有必要的属性
          const projectData = {
            id: project.id || Date.now(),
            name: project.name || '未命名项目',
            description: project.description || '',
            targetDays: project.targetDays || 30,
            color: project.color || '#1890ff',
            icon: project.icon || '📝',
            reminderTime: project.reminderTime || '',
            status: project.status || 'active',
            createTime: project.createTime || new Date().toISOString()
          };
          
          // 获取项目统计
          const stats = storage.getProjectStats(projectData.id);
          console.log(`项目 ${projectData.name} 统计数据:`, stats);
          
          return {
            ...projectData,
            stats: {
              consecutiveDays: stats.consecutiveDays || 0,
              points: stats.points || 0,
              completionRate: stats.completionRate || 0,
              totalDays: stats.totalDays || 0,
              targetDays: projectData.targetDays || 0
            }
          };
        } catch (error) {
          console.error(`处理项目时出错:`, error);
          return {
            id: Date.now(),
            name: '处理错误',
            description: '处理项目数据时出错',
            targetDays: 0,
            color: '#faad14',
            icon: '⚠️',
            stats: {
              consecutiveDays: 0,
              points: 0,
              completionRate: 0,
              totalDays: 0,
              targetDays: 0
            }
          };
        }
      });
      
      console.log('处理后的项目列表:', projectsWithStats);
      
      // 按创建时间倒序排序（最新的在前面）
      const sortedProjects = projectsWithStats.sort((a, b) => {
        try {
          const timeA = a.createTime ? new Date(a.createTime).getTime() : 0;
          const timeB = b.createTime ? new Date(b.createTime).getTime() : 0;
          return timeB - timeA;
        } catch (e) {
          return 0;
        }
      });
      
      this.setData({
        projects: sortedProjects,
        loading: false
      });
      
    } catch (error) {
      console.error('加载项目列表失败:', error);
      this.setData({
        error: '加载项目失败: ' + error.message,
        loading: false,
        projects: []
      });
      
      wx.showToast({
        title: '加载失败',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 跳转到添加项目页面
  goToAddProject: function() {
    console.log('跳转到operation页面');
    
    // operation是tabBar页面，必须用switchTab
    wx.switchTab({
      url: '/pages/operation/operation',
      success: () => {
        console.log('成功切换到operation页面');
      },
      fail: (err) => {
        console.error('切换失败:', err);
        wx.showToast({
          title: '跳转失败',
          icon: 'none'
        });
      }
    });
  },

  // 进入项目打卡页面
  goToProjectCheckin: function(e) {
    console.log('进入项目打卡页面');
    
    const projectId = e.currentTarget.dataset.id;
    const project = this.data.projects.find(p => p.id === projectId);
    
    if (project) {
      console.log('跳转到项目:', project.name);
      
      // 设置当前项目
      storage.setCurrentProject(projectId);
      
      // 跳转到打卡页面
      wx.navigateTo({
        url: `/pages/checkin/checkin?projectId=${projectId}&projectName=${encodeURIComponent(project.name)}&projectColor=${encodeURIComponent(project.color)}`,
        success: () => {
          console.log('跳转到打卡页面成功');
        },
        fail: (err) => {
          console.error('跳转到打卡页面失败:', err);
          wx.showToast({
            title: '跳转失败',
            icon: 'none'
          });
        }
      });
    } else {
      wx.showToast({
        title: '项目不存在',
        icon: 'none'
      });
    }
  },

  // 编辑项目
  editProject: function(e) {
    console.log('编辑项目');
    
    // 在微信小程序中，不能使用 e.stopPropagation()
    // 应该使用 catchtap 来阻止事件冒泡
    
    const projectId = e.currentTarget.dataset.id;
    const project = this.data.projects.find(p => p.id === projectId);
    
    if (project) {
      console.log('编辑项目数据:', project);
      
      // 确保编辑数据包含所有必要字段
      const editingData = {
        id: project.id,
        name: project.name || '',
        description: project.description || '',
        targetDays: project.targetDays || 30,
        color: project.color || '#1890ff',
        icon: project.icon || '📝',
        reminderTime: project.reminderTime || '',
        status: project.status || 'active'
      };
      
      console.log('设置编辑数据:', editingData);
      
      this.setData({
        editingProject: editingData,
        showEditModal: true
      }, () => {
        console.log('模态框状态已更新');
      });
    } else {
      console.error('未找到项目:', projectId);
      wx.showToast({
        title: '项目不存在',
        icon: 'none'
      });
    }
  },

  // 更新项目信息
  updateProject: function() {
    const { editingProject } = this.data;
    
    if (!editingProject) {
      wx.showToast({
        title: '编辑数据不存在',
        icon: 'none'
      });
      return;
    }
    
    if (!editingProject.name || editingProject.name.trim() === '') {
      wx.showToast({
        title: '请输入项目名称',
        icon: 'none'
      });
      return;
    }
    
    if (!editingProject.targetDays || editingProject.targetDays <= 0) {
      wx.showToast({
        title: '请输入有效的目标天数',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: '保存中...',
    });

    const updated = storage.updateProject(editingProject.id, {
      name: editingProject.name.trim(),
      description: editingProject.description.trim(),
      targetDays: editingProject.targetDays,
      color: editingProject.color
    });

    setTimeout(() => {
      wx.hideLoading();
      
      if (updated) {
        wx.showToast({
          title: '更新成功',
          icon: 'success'
        });

        this.setData({
          showEditModal: false,
          editingProject: null
        });

        // 重新加载项目
        this.loadProjects();
      } else {
        wx.showToast({
          title: '更新失败',
          icon: 'none'
        });
      }
    }, 800);
  },

  // 删除编辑中的项目
  deleteEditProject: function() {
    const { editingProject } = this.data;
    
    if (!editingProject) return;
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除项目"${editingProject.name}"吗？\n\n注意：所有打卡记录也将被删除，此操作不可恢复。`,
      confirmText: '删除',
      confirmColor: '#f5222d',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '删除中...',
          });
          
          const deleted = storage.deleteProject(editingProject.id);
          
          setTimeout(() => {
            wx.hideLoading();
            
            if (deleted) {
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              });
              
              this.setData({
                showEditModal: false,
                editingProject: null
              });
              
              // 重新加载项目
              this.loadProjects();
              
              // 更新全局标志
              const app = getApp();
              if (app.globalData) {
                app.globalData.projectsUpdated = true;
              }
            } else {
              wx.showToast({
                title: '删除失败',
                icon: 'none'
              });
            }
          }, 800);
        }
      }
    });
  },

  // 长按项目分享
  onProjectLongPress: function(e) {
    const projectId = e.currentTarget.dataset.id;
    const project = this.data.projects.find(p => p.id === projectId);
    
    if (project) {
      wx.showActionSheet({
        itemList: ['编辑项目', '删除项目', '复制项目ID'],
        success: (res) => {
          if (res.tapIndex === 0) {
            // 编辑项目
            this.editProject(e);
          } else if (res.tapIndex === 1) {
            // 删除项目
            wx.showModal({
              title: '确认删除',
              content: `确定要删除项目"${project.name}"吗？\n\n注意：所有打卡记录也将被删除，此操作不可恢复。`,
              confirmText: '删除',
              confirmColor: '#f5222d',
              cancelText: '取消',
              success: (confirmRes) => {
                if (confirmRes.confirm) {
                  wx.showLoading({
                    title: '删除中...',
                  });
                  
                  const deleted = storage.deleteProject(projectId);
                  
                  setTimeout(() => {
                    wx.hideLoading();
                    
                    if (deleted) {
                      wx.showToast({
                        title: '删除成功',
                        icon: 'success'
                      });
                      
                      // 重新加载项目
                      this.loadProjects();
                      
                      // 更新全局标志
                      const app = getApp();
                      if (app.globalData) {
                        app.globalData.projectsUpdated = true;
                      }
                    } else {
                      wx.showToast({
                        title: '删除失败',
                        icon: 'none'
                      });
                    }
                  }, 800);
                }
              }
            });
          } else if (res.tapIndex === 2) {
            // 复制项目ID
            wx.setClipboardData({
              data: String(projectId),
              success: () => {
                wx.showToast({
                  title: '已复制项目ID',
                  icon: 'success'
                });
              }
            });
          }
        },
        fail: (err) => {
          console.error('显示操作菜单失败:', err);
        }
      });
    }
  },

  // 关闭编辑模态框
  closeEditModal: function() {
    this.setData({
      showEditModal: false,
      editingProject: null
    });
  },

  // 防止模态框内部点击冒泡
  stopPropagation: function(e) {
    console.log('阻止事件冒泡');
    // 这个方法什么都不做，只是为了阻止事件冒泡到父元素
  },

  // 选择颜色
  selectColor: function(e) {
    const color = e.currentTarget.dataset.color;
    this.setData({
      'editingProject.color': color
    });
  },

  // 编辑项目名称输入
  onEditNameInput: function(e) {
    this.setData({
      'editingProject.name': e.detail.value
    });
  },

  // 编辑项目描述输入
  onEditDescInput: function(e) {
    this.setData({
      'editingProject.description': e.detail.value
    });
  },

  // 编辑目标天数输入
  onEditTargetDaysInput: function(e) {
    const value = parseInt(e.detail.value);
    this.setData({
      'editingProject.targetDays': isNaN(value) || value <= 0 ? 30 : value
    });
  },

  // 刷新项目列表
  onRefresh: function() {
    this.loadProjects();
    wx.showToast({
      title: '刷新成功',
      icon: 'success'
    });
  },

  // 清除错误
  clearError: function() {
    this.setData({
      error: null
    });
  },

  // 页面下拉刷新
  onPullDownRefresh: function() {
    console.log('下拉刷新');
    this.loadProjects();
    setTimeout(() => {
      wx.stopPullDownRefresh();
      wx.showToast({
        title: '刷新完成',
        icon: 'success'
      });
    }, 1000);
  },

  // 错误重试
  retryLoad: function() {
    this.setData({
      error: null
    });
    this.loadProjects();
  }
});