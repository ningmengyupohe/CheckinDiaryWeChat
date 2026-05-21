// pages/panel/panel.js - 修复版（兼容开发者工具）
const storage = require('../../utils/storage.js');

Page({
  data: {
    // 基础数据
    currentDate: '',
    swiperImages: [
      '/images/swiper01.jpg',
      '/images/swiper02.jpg', 
      '/images/swiper03.jpg'
    ],
    headerTitle: '打卡日记',
    headerSubtitle: '记录每一天的进步与成长',
    
    // 本周打卡数据
    weekDateRange: '',
    weekData: [],
    weekStats: { 
      completed: 0, 
      rate: 0, 
      streak: 0 
    },
    
    // 月度打卡数据
    monthDateRange: '',
    monthStats: { 
      total: 0, 
      rate: 0, 
      perfect: 0, 
      avg: 0 
    },
    monthProgress: [],
    
    // 项目列表数据（替代原来的tasks）
    projects: [],
    completedProjects: 0,
    totalProjects: 0,
    progressPercentage: 0,
    
    // 任务列表显示控制
    showTaskListFlag: false,
    
    // 其他UI状态
    showVideo: true,
    videoTitle: '傍晚火烧云',
    videoTime: '2024-01-15',
    videoSrc: 'http://127.0.0.1:3000/01.mp4',
    
    // 音乐播放器状态
    backgroundAudio: null,
    isPlaying: false,
    showMusicPanel: false,
    showSongList: true,
    isRandom: false,
    volume: 80,
    currentTime: '0:00',
    duration: '0:00',
    musicProgress: 0,
    currentMusicIndex: 0,
    musicList: [
      {
        id: 1,
        name: '六如亭',
        artist: '古风',
        url: 'http://127.0.0.1:3000/music/1.mp3',
        duration: '3:45'
      },
      {
        id: 2,
        name: '三月雨', 
        artist: '古风',
        url: 'http://127.0.0.1:3000/music/2.mp3',
        duration: '4:20'
      },
      {
        id: 3,
        name: '须臾永恒',
        artist: '流行音乐',
        url: 'http://127.0.0.1:3000/music/3.mp3',
        duration: '3:15'
      },
      {
        id: 4,
        name: '悠久',
        artist: '流行音乐',
        url: 'http://127.0.0.1:3000/music/4.mp3',
        duration: '2:50'
      },
      {
        id: 5,
        name: '远溯',
        artist: '架空',
        url: 'http://127.0.0.1:3000/music/5.mp3',
        duration: '3:30'
      }
    ]
  },

  onLoad: function (options) {
    console.log('panel页面加载');
    this.loadAllData();
    this.updateCurrentDate();
    this.setDateRanges();
    this.initBackgroundAudio();
  },

  onShow: function() {
    console.log('panel页面显示，重新加载数据');
    this.loadAllData();
    
    // 音乐状态处理
    if (this.data.backgroundAudio) {
      try {
        this.data.backgroundAudio.pause();
        this.data.backgroundAudio.stop();
      } catch (error) {
        console.log('音乐暂停操作:', error);
      }
      
      this.setData({ 
        isPlaying: false,
        currentTime: '0:00',
        musicProgress: 0
      });
    }
  },

  onHide: function() {
    if (this.data.backgroundAudio && this.data.isPlaying) {
      this.data.backgroundAudio.pause();
      this.setData({ isPlaying: false });
    }
  },

  onUnload: function() {
    if (this.data.backgroundAudio) {
      this.data.backgroundAudio.stop();
    }
  },

  // ============ 数据加载 ============
  
  // 加载所有数据
  loadAllData: function() {
    console.log('开始加载所有数据...');
    
    // 加载项目数据
    this.loadProjectData();
  },

  // 加载项目数据
  loadProjectData: function() {
    try {
      // 获取项目数据
      const projects = storage.getProjects();
      
      // 获取今日打卡记录
      const today = new Date().toISOString().split('T')[0];
      const checkinRecords = wx.getStorageSync('checkin_records') || [];
      
      // 计算每个项目的今日打卡状态
      const projectsWithStatus = projects.map(project => {
        const todayRecord = checkinRecords.find(record => 
          record.projectId === project.id && record.date === today
        );
        
        return {
          ...project,
          completed: !!todayRecord, // 今日是否已打卡
          checkinTime: todayRecord ? todayRecord.time : null,
          description: project.description || '每日打卡任务'
        };
      });
      
      // 计算今日完成的项目数量
      const completedProjects = projectsWithStatus.filter(project => project.completed).length;
      const totalProjects = projectsWithStatus.length;
      const progressPercentage = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0;
      
      // 更新UI
      this.setData({
        projects: projectsWithStatus,
        completedProjects: completedProjects,
        totalProjects: totalProjects,
        progressPercentage: progressPercentage
      });
      
      console.log('项目数据加载完成:', { 
        total: totalProjects, 
        completed: completedProjects,
        percentage: progressPercentage 
      });
      
      // 加载统计数据和打卡记录
      this.loadStatsAndRecords(projects);
      
    } catch (error) {
      console.error('加载项目数据失败:', error);
    }
  },

  // 加载统计数据和打卡记录
  loadStatsAndRecords: function(projects) {
    try {
      // 加载统计基础数据
      let stats = wx.getStorageSync('panel_stats');
      if (!stats) {
        stats = this.getDefaultStats();
        wx.setStorageSync('panel_stats', stats);
      }
      
      console.log('加载统计基础数据:', stats);
      
      // 计算真实统计数据
      const allStats = this.calculateRealStats(projects);
      
      // 合并默认数据和真实数据
      const mergedStats = this.mergeStats(stats, allStats);
      
      // 更新UI
      this.setData({
        weekDateRange: mergedStats.week.dateRange,
        weekData: mergedStats.week.data,
        weekStats: {
          completed: mergedStats.week.completed,
          rate: mergedStats.week.rate,
          streak: mergedStats.week.streak
        },
        monthDateRange: `${mergedStats.month.year}年${mergedStats.month.month}月`,
        monthStats: {
          total: mergedStats.month.total,
          rate: mergedStats.month.rate,
          perfect: mergedStats.month.perfect,
          avg: mergedStats.month.avg
        },
        monthProgress: mergedStats.month.progress
      });
      
      console.log('统计数据更新完成:', mergedStats);
      
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  },

  // ============ 任务列表控制 ============
  
  // 显示任务列表（展示项目列表）
  showTaskList: function() {
    // 确保项目数据已加载
    this.loadProjectData();
    
    this.setData({
      showTaskListFlag: true
    });
    
    // 滚动到任务列表位置
    setTimeout(() => {
      wx.createSelectorQuery()
        .select('.task-list')
        .boundingClientRect()
        .exec((res) => {
          if (res[0]) {
            wx.pageScrollTo({
              scrollTop: res[0].top - 20,
              duration: 300
            });
          }
        });
    }, 100);
  },
  
  // 隐藏任务列表
  hideTaskList: function() {
    this.setData({
      showTaskListFlag: false
    });
  },

  // 切换项目打卡状态
  toggleTask: function(e) {
    const projectId = e.currentTarget.dataset.id;
    const project = this.data.projects.find(p => p.id === projectId);
    
    if (!project) return;
    
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    // 获取打卡记录
    let checkinRecords = wx.getStorageSync('checkin_records') || [];
    
    if (project.completed) {
      // 如果是已完成状态，取消打卡（删除记录）
      checkinRecords = checkinRecords.filter(record => 
        !(record.projectId === projectId && record.date === today)
      );
    } else {
      // 如果是未完成状态，添加打卡记录
      checkinRecords.push({
        id: Date.now(),
        projectId: projectId,
        projectName: project.name,
        date: today,
        time: timeStr,
        notes: ''
      });
    }
    
    // 保存打卡记录
    wx.setStorageSync('checkin_records', checkinRecords);
    
    // 重新加载项目数据
    this.loadProjectData();
    
    // 显示提示
    wx.showToast({
      title: project.completed ? '已取消打卡！' : '打卡成功！',
      icon: 'success',
      duration: 1000
    });
  },

  // 一键完成所有项目打卡
  quickCompleteAll: function() {
    wx.showModal({
      title: '一键打卡',
      content: '确定要一键完成今日所有项目打卡吗？',
      success: (res) => {
        if (res.confirm) {
          const projects = this.data.projects;
          const today = new Date().toISOString().split('T')[0];
          const now = new Date();
          const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
          
          // 获取现有打卡记录
          let checkinRecords = wx.getStorageSync('checkin_records') || [];
          
          // 移除今天的所有打卡记录
          checkinRecords = checkinRecords.filter(record => record.date !== today);
          
          // 为所有项目添加打卡记录
          projects.forEach(project => {
            checkinRecords.push({
              id: Date.now() + project.id,
              projectId: project.id,
              projectName: project.name,
              date: today,
              time: timeStr,
              notes: '一键打卡'
            });
          });
          
          // 保存打卡记录
          wx.setStorageSync('checkin_records', checkinRecords);
          
          // 重新加载项目数据
          this.loadProjectData();
          
          wx.showToast({
            title: '已打卡所有项目！',
            icon: 'success'
          });
        }
      }
    });
  },

  // ============ 九宫格功能 ============
  
  // 数据分析中心 - 跳转到新页面
  showProgressAnalysis: function() {
    wx.navigateTo({
      url: '/pages/analysis/analysis',
      fail: (err) => {
        console.error('跳转到分析页面失败:', err);
        wx.showToast({
          title: '页面暂未开发',
          icon: 'none'
        });
      }
    });
  },

  // 打卡记录
  goToCheckinRecords: function() {
    wx.navigateTo({
      url: '/pages/calendar-checkin/calendar-checkin'
    });
  },

  // 成就徽章 - 跳转到新页面
  viewBadges: function() {
    wx.navigateTo({
      url: '/pages/badges/badges',
      fail: (err) => {
        console.error('跳转到徽章页面失败:', err);
        wx.showToast({
          title: '页面暂未开发',
          icon: 'none'
        });
      }
    });
  },

  // 设置中心 - 改为导入导出功能
  goToSettings: function() {
    wx.showActionSheet({
      itemList: ['数据管理（导入/导出）', '常规设置', '关于我们'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.manageData();
            break;
          case 1:
            wx.navigateTo({
              url: '/pages/settings/settings'
            });
            break;
          case 2:
            this.showAbout();
            break;
        }
      },
      fail: (err) => {
        wx.navigateTo({
          url: '/pages/settings/settings'
        });
      }
    });
  },

  // 显示关于信息
  showAbout: function() {
    wx.showModal({
      title: '关于习惯打卡助手',
      content: '版本：v2.0\n\n功能特色：\n✅ 项目管理\n✅ 每日打卡\n✅ 数据统计\n✅ 导入导出\n✅ 数据备份\n\n如有问题，请联系开发者。',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  // 项目管理 - 跳转到 projects 页面
  goToProjects: function() {
    wx.navigateTo({
      url: '/pages/projects/projects'
    });
  },

  // 天气图表
  goToWeather: function() {
    wx.navigateTo({
      url: '/pages/weather/weather'
    });
  },

  // 帮助中心
  showHelp: function() {
    wx.navigateTo({
      url: '/pages/help/help',
      fail: (err) => {
        wx.showModal({
          title: '📚 帮助中心',
          content: '🚀 快速入门指南\n\n1️⃣ 数据分析中心\n   • 查看详细统计报告\n   • 分析打卡趋势\n   • 导出分析数据\n\n2️⃣ 打卡记录\n   • 查看历史打卡\n   • 统计完成情况\n\n3️⃣ 一键打卡\n   • 快速完成今日所有项目打卡\n\n4️⃣ 任务管理\n   • 查看项目列表\n   • 标记项目打卡状态\n\n5️⃣ 数据管理\n   • 导入/导出数据\n   • 备份与恢复\n\n6️⃣ 项目管理\n   • 查看/编辑项目\n   • 管理项目信息\n\n💡 小贴士：每天坚持打卡，数据分析会帮助您更好地了解自己的习惯！',
          showCancel: false,
          confirmText: '明白了'
        });
      }
    });
  },

  // ============ 数据管理功能 ============
  
  // 数据管理功能菜单
  manageData: function() {
    wx.showActionSheet({
      itemList: ['导出完整数据', '导出打卡记录', '导出项目列表', '导入数据', '清除所有数据'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.exportCompleteData();
            break;
          case 1:
            this.exportCheckinRecordsOnly();
            break;
          case 2:
            this.exportProjectsOnly();
            break;
          case 3:
            this.importCheckinData();
            break;
          case 4:
            this.clearAllData();
            break;
        }
      }
    });
  },

  // 清除所有数据
  clearAllData: function() {
    wx.showModal({
      title: '⚠️ 警告：清除所有数据',
      content: '此操作将永久删除以下所有数据：\n\n• 所有打卡项目\n• 所有打卡记录\n• 所有统计信息\n• 所有设置\n\n此操作不可恢复！确定要继续吗？',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          // 再次确认
          wx.showModal({
            title: '最后确认',
            content: '请输入 "DELETE" 以确认删除所有数据：',
            editable: true,
            placeholderText: '在此输入 DELETE',
            confirmColor: '#ff4d4f',
            success: (res2) => {
              if (res2.confirm && res2.content === 'DELETE') {
                this.executeClearAllData();
              } else if (res2.confirm) {
                wx.showToast({
                  title: '输入错误，操作已取消',
                  icon: 'error',
                  duration: 2000
                });
              }
            }
          });
        }
      }
    });
  },

  // 执行清除所有数据
  executeClearAllData: function() {
    wx.showLoading({
      title: '正在清除数据...',
    });
    
    try {
      // 获取要清除的所有存储键
      const allKeys = [
        'projects',           // 项目数据
        'checkin_records',    // 打卡记录
        'currentProjectId',   // 当前项目ID
        'panel_stats',        // 统计面板数据
        'badge_records',      // 徽章记录
        'user_stats',         // 用户统计
        'app_settings',       // 应用设置
        'reminder_settings',  // 提醒设置
        'backup_history',     // 备份历史
        'theme_settings',     // 主题设置
        'last_checkin_time',  // 最后打卡时间
        'achievements',       // 成就数据
        'streaks_data',       // 连续打卡数据
        'project_stats_cache' // 项目统计缓存
      ];
      
      // 记录清除前的数据量（用于反馈）
      const projectsCount = wx.getStorageSync('projects')?.length || 0;
      const recordsCount = wx.getStorageSync('checkin_records')?.length || 0;
      
      // 清除所有存储数据
      let clearedCount = 0;
      allKeys.forEach(key => {
        try {
          wx.removeStorageSync(key);
          clearedCount++;
          console.log(`已清除: ${key}`);
        } catch (error) {
          console.warn(`清除 ${key} 失败:`, error);
        }
      });
      
      // 额外清理可能存在的其他数据
      try {
        const storageInfo = wx.getStorageInfoSync();
        if (storageInfo.keys && storageInfo.keys.length > 0) {
          storageInfo.keys.forEach(key => {
            if (key.startsWith('habit_') || 
                key.startsWith('checkin_') || 
                key.startsWith('project_')) {
              wx.removeStorageSync(key);
              clearedCount++;
            }
          });
        }
      } catch (error) {
        console.warn('清理额外数据失败:', error);
      }
      
      wx.hideLoading();
      
      // 显示清除结果
      wx.showModal({
        title: '✅ 数据清除完成',
        content: `已成功清除所有数据！\n\n清除详情：\n• 清除了 ${projectsCount} 个项目\n• 清除了 ${recordsCount} 条打卡记录\n• 移除了 ${clearedCount} 个数据项\n\n应用将恢复到初始状态。`,
        showCancel: false,
        success: () => {
          // 重启应用以刷新所有页面
          wx.reLaunch({
            url: '/pages/index/index'
          });
        }
      });
      
    } catch (error) {
      wx.hideLoading();
      console.error('清除数据失败:', error);
      wx.showModal({
        title: '清除失败',
        content: '清除数据时发生错误，请重试或重启应用。',
        showCancel: false
      });
    }
  },

  // 导出完整数据（包含项目和打卡记录）
  exportCompleteData: function() {
    try {
      const checkinRecords = wx.getStorageSync('checkin_records') || [];
      const projects = wx.getStorageSync('projects') || [];
      
      if (projects.length === 0 && checkinRecords.length === 0) {
        wx.showToast({
          title: '暂无数据可导出',
          icon: 'none'
        });
        return;
      }
      
      // 构建完整的导出数据
      const exportData = {
        meta: {
          version: '2.0',
          exportDate: new Date().toISOString(),
          exportType: 'complete_data',
          totalProjects: projects.length,
          totalRecords: checkinRecords.length,
          appName: '习惯打卡助手'
        },
        data: {
          // 项目数据
          projects: projects.map(project => ({
            id: project.id,
            name: project.name,
            description: project.description || '',
            targetDays: project.targetDays || 0,
            reminderTime: project.reminderTime || '',
            color: project.color || '#1890ff',
            icon: project.icon || '🏃',
            status: project.status || 'active',
            createdAt: project.createdAt || new Date().toISOString(),
            notes: project.notes || ''
          })),
          
          // 打卡记录数据
          checkinRecords: checkinRecords.map(record => ({
            id: record.id,
            projectId: record.projectId,
            date: record.date || '',
            timestamp: record.timestamp || Date.now(),
            localDate: record.localDate || '',
            localHour: record.localHour || 0,
            notes: record.notes || ''
          }))
        }
      };
      
      const jsonStr = JSON.stringify(exportData, null, 2);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `habit_data_${timestamp}.json`;
      
      // 检测是否在开发者工具环境
      const systemInfo = wx.getSystemInfoSync();
      const isDevTools = systemInfo.platform === 'devtools';
      
      if (isDevTools) {
        // 开发者工具环境下，使用复制到剪贴板
        wx.setClipboardData({
          data: jsonStr,
          success: () => {
            wx.showModal({
              title: '导出成功（开发者工具）',
              content: `完整数据已复制到剪贴板！\n\n包含：\n• ${projects.length} 个项目\n• ${checkinRecords.length} 条打卡记录\n\n在开发者工具中无法直接保存文件，请粘贴到文本编辑器中保存为JSON文件。`,
              showCancel: false,
              confirmText: '知道了'
            });
          },
          fail: (err) => {
            console.error('复制失败:', err);
            this.fallbackToClipboard(jsonStr, '完整数据');
          }
        });
      } else {
        // 真机环境下尝试保存文件
        const filePath = this.getFilePath(fileName);
        
        if (!filePath) {
          this.fallbackToClipboard(jsonStr, '完整数据');
          return;
        }
        
        wx.getFileSystemManager().writeFile({
          filePath: filePath,
          data: jsonStr,
          encoding: 'utf8',
          success: (res) => {
            // 尝试多种保存方式
            this.saveFileWithMultipleOptions(filePath, fileName, '完整数据');
          },
          fail: (err) => {
            console.error('写入文件失败:', err);
            // 回退到剪贴板
            this.fallbackToClipboard(jsonStr, '完整数据');
          }
        });
      }
      
    } catch (error) {
      console.error('导出完整数据失败:', error);
      wx.showToast({
        title: '导出失败',
        icon: 'error'
      });
    }
  },

  // 导出打卡记录
  exportCheckinRecordsOnly: function() {
    try {
      const checkinRecords = wx.getStorageSync('checkin_records') || [];
      const projects = wx.getStorageSync('projects') || [];
      
      if (checkinRecords.length === 0) {
        wx.showToast({
          title: '暂无打卡记录',
          icon: 'none'
        });
        return;
      }
      
      // 构建导出数据
      const exportData = {
        meta: {
          version: '2.0',
          exportDate: new Date().toISOString(),
          exportType: 'checkin_records_only',
          totalRecords: checkinRecords.length
        },
        data: {
          checkinRecords: checkinRecords.map(record => {
            // 查找对应的项目名称
            const project = projects.find(p => String(p.id) === String(record.projectId));
            const projectName = project ? project.name : '未知项目';
            
            return {
              id: record.id,
              projectId: record.projectId,
              projectName: projectName,
              date: record.date || '',
              timestamp: record.timestamp || Date.now(),
              localDate: record.localDate || '',
              localHour: record.localHour || 0,
              notes: record.notes || ''
            };
          })
        }
      };
      
      const jsonStr = JSON.stringify(exportData, null, 2);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `checkin_records_${timestamp}.json`;
      
      this.saveOrCopyData(jsonStr, fileName, '打卡记录', checkinRecords.length, 0);
      
    } catch (error) {
      console.error('导出打卡记录失败:', error);
      wx.showToast({
        title: '导出失败',
        icon: 'error'
      });
    }
  },

  // 导出项目列表
  exportProjectsOnly: function() {
    try {
      const projects = wx.getStorageSync('projects') || [];
      
      if (projects.length === 0) {
        wx.showToast({
          title: '暂无项目',
          icon: 'none'
        });
        return;
      }
      
      // 获取每个项目的打卡记录数量
      const checkinRecords = wx.getStorageSync('checkin_records') || [];
      const projectsWithStats = projects.map(project => {
        const projectRecords = checkinRecords.filter(r => String(r.projectId) === String(project.id));
        const completionRate = project.targetDays ? 
          Math.min(Math.round((projectRecords.length / project.targetDays) * 100), 100) : 0;
        
        return {
          id: project.id,
          name: project.name,
          description: project.description || '',
          targetDays: project.targetDays || 0,
          reminderTime: project.reminderTime || '',
          color: project.color || '#1890ff',
          icon: project.icon || '🏃',
          status: project.status || 'active',
          createdAt: project.createdAt || new Date().toISOString(),
          notes: project.notes || '',
          stats: {
            totalCheckins: projectRecords.length,
            completionRate: completionRate
          }
        };
      });
      
      // 构建导出数据
      const exportData = {
        meta: {
          version: '2.0',
          exportDate: new Date().toISOString(),
          exportType: 'projects_only',
          totalProjects: projects.length
        },
        data: {
          projects: projectsWithStats
        }
      };
      
      const jsonStr = JSON.stringify(exportData, null, 2);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `projects_${timestamp}.json`;
      
      this.saveOrCopyData(jsonStr, fileName, '项目列表', 0, projects.length);
      
    } catch (error) {
      console.error('导出项目列表失败:', error);
      wx.showToast({
        title: '导出失败',
        icon: 'error'
      });
    }
  },

  // 通用保存或复制数据
  saveOrCopyData: function(jsonStr, fileName, dataType, recordsCount, projectsCount) {
    // 检测是否在开发者工具环境
    const systemInfo = wx.getSystemInfoSync();
    const isDevTools = systemInfo.platform === 'devtools';
    
    let infoText = '';
    if (recordsCount > 0) {
      infoText += `• ${recordsCount} 条打卡记录\n`;
    }
    if (projectsCount > 0) {
      infoText += `• ${projectsCount} 个项目\n`;
    }
    
    if (isDevTools) {
      // 开发者工具环境下，使用复制到剪贴板
      wx.setClipboardData({
        data: jsonStr,
        success: () => {
          wx.showModal({
            title: `导出成功（开发者工具）`,
            content: `${dataType}已复制到剪贴板！\n\n包含：\n${infoText}\n在开发者工具中无法直接保存文件，请粘贴到文本编辑器中保存为JSON文件。`,
            showCancel: false,
            confirmText: '知道了'
          });
        },
        fail: (err) => {
          console.error('复制失败:', err);
          this.fallbackToClipboard(jsonStr, dataType);
        }
      });
    } else {
      // 真机环境下尝试保存文件
      const filePath = this.getFilePath(fileName);
      
      if (!filePath) {
        this.fallbackToClipboard(jsonStr, dataType);
        return;
      }
      
      wx.getFileSystemManager().writeFile({
        filePath: filePath,
        data: jsonStr,
        encoding: 'utf8',
        success: (res) => {
          this.saveFileWithMultipleOptions(filePath, fileName, dataType);
        },
        fail: (err) => {
          console.error('写入文件失败:', err);
          this.fallbackToClipboard(jsonStr, dataType);
        }
      });
    }
  },

  // 使用多种方式保存文件
  saveFileWithMultipleOptions: function(filePath, fileName, dataType) {
    wx.showActionSheet({
      itemList: ['保存到手机', '复制文件路径', '仅显示信息'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.saveFileToDevice(filePath, fileName, dataType);
            break;
          case 1:
            this.copyFilePath(filePath, fileName, dataType);
            break;
          case 2:
            this.showFileInfo(filePath, fileName, dataType);
            break;
        }
      },
      fail: (err) => {
        console.error('显示选项失败:', err);
        this.showFileInfo(filePath, fileName, dataType);
      }
    });
  },

  // 保存文件到设备
  saveFileToDevice: function(filePath, fileName, dataType) {
    try {
      // 尝试使用微信的文件保存API
      if (wx.saveFileToDisk) {
        wx.saveFileToDisk({
          filePath: filePath,
          success: () => {
            wx.showToast({
              title: `${dataType}保存成功`,
              icon: 'success',
              duration: 2000
            });
          },
          fail: (err) => {
            console.error('保存文件失败:', err);
            
            // 回退到提示信息
            this.showFileInfo(filePath, fileName, dataType, true);
          }
        });
      } else {
        // API不可用，显示提示信息
        this.showFileInfo(filePath, fileName, dataType, true);
      }
    } catch (error) {
      console.error('保存文件异常:', error);
      this.showFileInfo(filePath, fileName, dataType, true);
    }
  },

  // 复制文件路径
  copyFilePath: function(filePath, fileName, dataType) {
    wx.setClipboardData({
      data: filePath,
      success: () => {
        wx.showToast({
          title: '文件路径已复制',
          icon: 'success',
          duration: 2000
        });
      },
      fail: (err) => {
        console.error('复制路径失败:', err);
        wx.showModal({
          title: '文件路径',
          content: `文件路径：${filePath}`,
          showCancel: false
        });
      }
    });
  },

  // 显示文件信息
  showFileInfo: function(filePath, fileName, dataType, isSaveFailed = false) {
    const title = isSaveFailed ? '文件保存提示' : `${dataType}导出成功`;
    const content = isSaveFailed ? 
      `由于系统限制，无法直接保存文件到手机。\n\n文件已保存到小程序缓存：\n${filePath}\n\n您可以通过文件管理器找到此文件。` :
      `${dataType}已成功导出！\n\n文件信息：\n• 文件名：${fileName}\n• 保存路径：${filePath}\n\n请通过手机文件管理器访问此文件。`;
    
    wx.showModal({
      title: title,
      content: content,
      showCancel: false,
      confirmText: '知道了'
    });
  },

  // 回退到剪贴板
  fallbackToClipboard: function(content, dataType) {
    wx.setClipboardData({
      data: content,
      success: () => {
        wx.showModal({
          title: `已复制${dataType}到剪贴板`,
          content: `由于系统限制，无法直接保存文件。\n\n${dataType}已复制到剪贴板，请粘贴到文本编辑器或其他应用中保存。`,
          showCancel: false,
          confirmText: '知道了'
        });
      },
      fail: (err) => {
        console.error('复制失败:', err);
        wx.showModal({
          title: `导出${dataType}数据`,
          content: `无法保存文件，也无法复制到剪贴板。\n\n以下是数据内容：\n\n${content.substring(0, 1500)}${content.length > 1500 ? '...（数据过长，已截断）' : ''}`,
          showCancel: false,
          confirmText: '手动复制'
        });
      }
    });
  },

  // 获取文件路径（兼容不同环境）
  getFilePath: function(fileName) {
    try {
      // 尝试获取用户数据路径
      if (wx.env && wx.env.USER_DATA_PATH) {
        return `${wx.env.USER_DATA_PATH}/${fileName}`;
      }
      
      // 备用方案：使用临时文件路径
      const fs = wx.getFileSystemManager();
      const tempDir = wx.env ? (wx.env.USER_DATA_PATH || '') : '';
      return `${tempDir}/${fileName}`;
      
    } catch (error) {
      console.error('获取文件路径失败:', error);
      return null;
    }
  },

  // 复制到剪贴板
  copyToClipboard: function() {
    try {
      const checkinRecords = wx.getStorageSync('checkin_records') || [];
      const projects = wx.getStorageSync('projects') || [];
      
      if (checkinRecords.length === 0 && projects.length === 0) {
        wx.showToast({
          title: '暂无数据',
          icon: 'none'
        });
        return;
      }
      
      const exportData = {
        meta: {
          version: '2.0',
          exportDate: new Date().toISOString(),
          totalProjects: projects.length,
          totalRecords: checkinRecords.length
        },
        data: {
          projects: projects.slice(0, 5), // 只复制前5个项目
          checkinRecords: checkinRecords.slice(0, 10) // 只复制前10条记录
        }
      };
      
      const jsonStr = JSON.stringify(exportData, null, 2);
      
      wx.setClipboardData({
        data: jsonStr,
        success: () => {
          wx.showToast({
            title: '数据已复制到剪贴板',
            icon: 'success',
            duration: 2000
          });
        },
        fail: (err) => {
          console.error('复制失败:', err);
          wx.showModal({
            title: '数据复制失败',
            content: `无法自动复制到剪贴板。\n\n请手动复制以下数据：\n\n${jsonStr.substring(0, 2000)}${jsonStr.length > 2000 ? '...（数据过长，已截断）' : ''}`,
            showCancel: false,
            confirmText: '手动复制'
          });
        }
      });
      
    } catch (error) {
      console.error('复制数据失败:', error);
      wx.showToast({
        title: '复制失败',
        icon: 'error'
      });
    }
  },

  
  // 导入打卡数据
  importCheckinData: function() {
    wx.showActionSheet({
      itemList: ['从文件导入', '手动输入导入', '扫码导入'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.importFromFile();
            break;
          case 1:
            this.importFromInput();
            break;
          case 2:
            this.importFromQRCode();
            break;
        }
      }
    });
  },

  // 从文件导入
  importFromFile: function() {
    wx.showModal({
      title: '导入提示',
      content: '请选择要导入的数据文件（支持JSON/CSV/TXT格式）',
      success: (res) => {
        if (res.confirm) {
          wx.chooseMessageFile({
            count: 1,
            type: 'file',
            extension: ['json', 'csv', 'txt'],
            success: (res) => {
              const tempFilePath = res.tempFiles[0].path;
              this.processImportFile(tempFilePath);
            },
            fail: (err) => {
              console.error('选择文件失败:', err);
              wx.showToast({
                title: '选择文件失败',
                icon: 'error'
              });
            }
          });
        }
      }
    });
  },

  // 处理导入文件
  processImportFile: function(filePath) {
    wx.showLoading({
      title: '正在解析文件...',
    });
    
    // 读取文件内容
    wx.getFileSystemManager().readFile({
      filePath: filePath,
      encoding: 'utf8',
      success: (res) => {
        wx.hideLoading();
        
        try {
          const content = res.data;
          let importData;
          
          // 尝试解析为JSON
          if (filePath.endsWith('.json') || content.trim().startsWith('{')) {
            importData = JSON.parse(content);
          } 
          // 尝试解析为CSV
          else if (filePath.endsWith('.csv') || content.includes(',')) {
            importData = this.parseCSV(content);
          } 
          // 其他格式
          else {
            // 尝试多种解析方式
            try {
              importData = JSON.parse(content);
            } catch {
              importData = { data: { checkinRecords: this.parseTextData(content) } };
            }
          }
          
          this.verifyImportData(importData);
          
        } catch (error) {
          console.error('解析文件失败:', error);
          wx.showModal({
            title: '解析失败',
            content: '文件格式不正确，请检查文件内容',
            showCancel: false
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('读取文件失败:', err);
        wx.showToast({
          title: '读取文件失败',
          icon: 'error'
        });
      }
    });
  },

  // 解析CSV数据
  parseCSV: function(csvContent) {
    const lines = csvContent.split('\n').filter(line => line.trim() !== '');
    const headers = lines[0].split(',').map(header => header.replace(/"/g, '').trim());
    
    const checkinRecords = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const values = this.parseCSVLine(line);
      
      if (values.length === headers.length) {
        const record = {};
        headers.forEach((header, index) => {
          record[header] = values[index].replace(/"/g, '').trim();
        });
        
        // 标准化记录格式
        const normalizedRecord = {
          id: Date.now() + i,
          projectId: record['项目ID'] || record['projectId'] || '',
          projectName: record['项目名称'] || record['projectName'] || '',
          date: record['打卡日期'] || record['date'] || '',
          time: record['打卡时间'] || record['time'] || '',
          notes: record['备注'] || record['notes'] || ''
        };
        
        checkinRecords.push(normalizedRecord);
      }
    }
    
    return {
      data: {
        checkinRecords: checkinRecords
      }
    };
  },

  // 解析CSV行（处理包含逗号的字段）
  parseCSVLine: function(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // 双引号转义
          current += '"';
          i++; // 跳过下一个引号
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  },

  // 解析文本数据
  parseTextData: function(textContent) {
    const records = [];
    const lines = textContent.split('\n').filter(line => line.trim() !== '');
    
    lines.forEach((line, index) => {
      const parts = line.split(/\s+/).filter(part => part.trim() !== '');
      
      if (parts.length >= 4) {
        records.push({
          id: Date.now() + index,
          projectId: parts[0],
          projectName: parts[1],
          date: parts[2],
          time: parts[3],
          notes: parts.slice(4).join(' ')
        });
      }
    });
    
    return records;
  },

  // 验证导入数据
  verifyImportData: function(importData) {
    let checkinRecords = [];
    let projects = [];
    
    // 提取数据
    if (importData.data && importData.data.checkinRecords) {
      checkinRecords = importData.data.checkinRecords;
    } else if (Array.isArray(importData)) {
      checkinRecords = importData;
    } else if (importData.checkinRecords) {
      checkinRecords = importData.checkinRecords;
    }
    
    if (importData.data && importData.data.projects) {
      projects = importData.data.projects;
    }
    
    // 数据验证
    const validRecords = checkinRecords.filter(record => {
      return record && 
             record.projectId && 
             record.date;
    });
    
    const validProjects = projects.filter(project => {
      return project && project.id && project.name;
    });
    
    // 显示确认对话框
    wx.showModal({
      title: '导入确认',
      content: `发现 ${validRecords.length} 条打卡记录和 ${validProjects.length} 个项目\n\n导入方式：\n1. 追加导入（保留现有数据）\n2. 覆盖导入（清空现有数据）`,
      confirmText: '追加导入',
      cancelText: '覆盖导入',
      success: (res) => {
        if (res.confirm || res.cancel) {
          const mode = res.confirm ? 'append' : 'replace';
          this.executeImport(validRecords, validProjects, mode);
        }
      }
    });
  },

  // 执行导入
  executeImport: function(checkinRecords, projects, mode) {
    wx.showLoading({
      title: '正在导入...',
    });
    
    try {
      // 处理项目导入
      if (projects.length > 0) {
        const existingProjects = storage.getProjects();
        let newProjects;
        
        if (mode === 'replace') {
          newProjects = projects;
        } else {
          // 追加模式，避免重复项目
          const existingIds = existingProjects.map(p => String(p.id));
          const uniqueProjects = projects.filter(p => !existingIds.includes(String(p.id)));
          newProjects = [...existingProjects, ...uniqueProjects];
        }
        
        wx.setStorageSync('projects', newProjects);
      }
      
      // 处理打卡记录导入
      const existingRecords = wx.getStorageSync('checkin_records') || [];
      let newRecords;
      
      if (mode === 'replace') {
        newRecords = checkinRecords;
      } else {
        // 追加模式，避免重复记录
        const existingKeys = new Set(
          existingRecords.map(r => `${r.projectId}_${r.date}_${r.time}`)
        );
        const uniqueRecords = checkinRecords.filter(r => {
          const key = `${r.projectId}_${r.date}_${r.time}`;
          return !existingKeys.has(key);
        });
        newRecords = [...existingRecords, ...uniqueRecords];
      }
      
      wx.setStorageSync('checkin_records', newRecords);
      
      wx.hideLoading();
      
      wx.showModal({
        title: '导入成功',
        content: `成功导入 ${projects.length} 个项目\n成功导入 ${checkinRecords.length} 条打卡记录`,
        showCancel: false,
        success: () => {
          // 重新加载数据
          this.loadAllData();
          
          // 刷新徽章数据
          const pages = getCurrentPages();
          const badgesPage = pages.find(page => page.route === 'pages/badges/badges');
          if (badgesPage) {
            badgesPage.loadData();
          }
        }
      });
      
    } catch (error) {
      wx.hideLoading();
      console.error('导入执行失败:', error);
      wx.showToast({
        title: '导入失败',
        icon: 'error'
      });
    }
  },

  // 手动输入导入
  importFromInput: function() {
    wx.showModal({
      title: '手动输入导入',
      content: '请输入JSON格式的打卡数据',
      editable: true,
      placeholderText: '{"data": {"checkinRecords": [...]}}',
      success: (res) => {
        if (res.confirm && res.content) {
          try {
            const importData = JSON.parse(res.content);
            this.verifyImportData(importData);
          } catch (error) {
            wx.showToast({
              title: 'JSON格式错误',
              icon: 'error'
            });
          }
        }
      }
    });
  },

  // 扫码导入
  importFromQRCode: function() {
    wx.scanCode({
      onlyFromCamera: false,
      scanType: ['qrCode'],
      success: (res) => {
        try {
          const importData = JSON.parse(res.result);
          this.verifyImportData(importData);
        } catch (error) {
          // 如果不是JSON，尝试其他格式
          this.verifyImportData({ data: { checkinRecords: this.parseTextData(res.result) } });
        }
      },
      fail: (err) => {
        console.error('扫码失败:', err);
        wx.showToast({
          title: '扫码失败',
          icon: 'error'
        });
      }
    });
  },

  // 数据备份与恢复
  backupAndRestore: function() {
    wx.showActionSheet({
      itemList: ['创建完整备份', '从备份恢复', '查看备份历史'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.createFullBackup();
            break;
          case 1:
            this.restoreFromBackup();
            break;
          case 2:
            this.viewBackupHistory();
            break;
        }
      }
    });
  },

  // 创建完整备份
  createFullBackup: function() {
    try {
      const backupData = {
        meta: {
          version: '1.0',
          backupDate: new Date().toISOString(),
          device: wx.getSystemInfoSync().model,
          appVersion: '1.0.0'
        },
        data: {
          projects: storage.getProjects(),
          checkinRecords: wx.getStorageSync('checkin_records') || [],
          stats: wx.getStorageSync('panel_stats') || {}
        }
      };
      
      const jsonStr = JSON.stringify(backupData, null, 2);
      const fileName = `habit_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      
      // 检测环境
      const systemInfo = wx.getSystemInfoSync();
      const isDevTools = systemInfo.platform === 'devtools';
      
      if (isDevTools) {
        // 开发者工具环境，复制到剪贴板
        wx.setClipboardData({
          data: jsonStr,
          success: () => {
            // 保存备份记录
            const backups = wx.getStorageSync('backup_history') || [];
            backups.unshift({
              name: fileName,
              date: new Date().toISOString(),
              size: jsonStr.length,
              data: backupData
            });
            
            // 只保留最近10个备份
            if (backups.length > 10) {
              backups.pop();
            }
            
            wx.setStorageSync('backup_history', backups);
            
            wx.showModal({
              title: '备份成功（开发者工具）',
              content: `备份数据已复制到剪贴板\n\n备份时间：${new Date().toLocaleString()}\n包含：${backupData.data.projects.length}个项目，${backupData.data.checkinRecords.length}条记录\n\n请粘贴到文本编辑器中保存备份文件`,
              showCancel: false
            });
          },
          fail: (err) => {
            console.error('复制备份失败:', err);
            wx.showModal({
              title: '备份数据',
              content: `备份失败，以下是备份数据：\n\n${jsonStr.substring(0, 2000)}${jsonStr.length > 2000 ? '...（数据过长，已截断）' : ''}`,
              showCancel: false
            });
          }
        });
      } else {
        // 真机环境，尝试保存文件
        const filePath = this.getFilePath(fileName);
        
        if (!filePath) {
          wx.setClipboardData({
            data: jsonStr,
            success: () => {
              wx.showModal({
                title: '备份数据已复制到剪贴板',
                content: `由于系统限制，无法直接保存文件。\n\n备份数据已复制到剪贴板，请粘贴到文本编辑器中保存。`,
                showCancel: false
              });
            }
          });
          return;
        }
        
        wx.getFileSystemManager().writeFile({
          filePath: filePath,
          data: jsonStr,
          encoding: 'utf8',
          success: () => {
            // 保存备份记录
            const backups = wx.getStorageSync('backup_history') || [];
            backups.unshift({
              name: fileName,
              date: new Date().toISOString(),
              size: jsonStr.length,
              filePath: filePath,
              data: backupData
            });
            
            // 只保留最近10个备份
            if (backups.length > 10) {
              backups.pop();
            }
            
            wx.setStorageSync('backup_history', backups);
            
            wx.showModal({
              title: '备份成功',
              content: `已创建备份文件：${fileName}\n包含 ${backupData.data.projects.length} 个项目，${backupData.data.checkinRecords.length} 条打卡记录`,
              showCancel: false
            });
          },
          fail: (err) => {
            console.error('创建备份失败:', err);
            wx.showToast({
              title: '备份失败',
              icon: 'error'
            });
          }
        });
      }
      
    } catch (error) {
      console.error('创建备份失败:', error);
      wx.showToast({
        title: '备份失败',
        icon: 'error'
      });
    }
  },

  // 从备份恢复
  restoreFromBackup: function() {
    const backups = wx.getStorageSync('backup_history') || [];
    
    if (backups.length === 0) {
      wx.showToast({
        title: '暂无备份文件',
        icon: 'none'
      });
      return;
    }
    
    const backupItems = backups.map((backup, index) => {
      const date = new Date(backup.date);
      return `${date.toLocaleDateString()} ${date.toLocaleTimeString()} (${backup.data.data.projects.length}个项目)`;
    });
    
    wx.showActionSheet({
      itemList: backupItems,
      success: (res) => {
        const backupIndex = res.tapIndex;
        const backup = backups[backupIndex];
        
        wx.showModal({
          title: '恢复确认',
          content: `确定要恢复备份吗？\n备份时间：${new Date(backup.date).toLocaleString()}\n包含：${backup.data.data.projects.length}个项目，${backup.data.data.checkinRecords.length}条记录\n⚠️ 注意：这将覆盖现有数据！`,
          success: (res) => {
            if (res.confirm) {
              this.restoreBackup(backup.data);
            }
          }
        });
      }
    });
  },

  // 恢复备份
  restoreBackup: function(backupData) {
    wx.showLoading({
      title: '正在恢复...',
    });
    
    try {
      // 恢复所有数据
      wx.setStorageSync('projects', backupData.data.projects || []);
      wx.setStorageSync('checkin_records', backupData.data.checkinRecords || []);
      wx.setStorageSync('panel_stats', backupData.data.stats || {});
      
      wx.hideLoading();
      
      wx.showModal({
        title: '恢复成功',
        content: `已成功恢复备份！\n恢复了 ${backupData.data.projects.length} 个项目，${backupData.data.checkinRecords.length} 条打卡记录`,
        showCancel: false,
        success: () => {
          // 重新加载所有页面数据
          this.loadAllData();
          
          // 通知其他页面刷新
          const pages = getCurrentPages();
          pages.forEach(page => {
            if (page.loadData) {
              page.loadData();
            }
          });
        }
      });
      
    } catch (error) {
      wx.hideLoading();
      console.error('恢复失败:', error);
      wx.showToast({
        title: '恢复失败',
        icon: 'error'
      });
    }
  },

  // 查看备份历史
  viewBackupHistory: function() {
    const backups = wx.getStorageSync('backup_history') || [];
    
    if (backups.length === 0) {
      wx.showModal({
        title: '备份历史',
        content: '暂无备份记录',
        showCancel: false
      });
      return;
    }
    
    let content = `共 ${backups.length} 个备份：\n\n`;
    
    backups.forEach((backup, index) => {
      const date = new Date(backup.date);
      content += `${index + 1}. ${date.toLocaleString()}\n`;
      content += `   项目：${backup.data.data.projects.length}个，记录：${backup.data.data.checkinRecords.length}条\n`;
      content += `   大小：${(backup.size / 1024).toFixed(2)}KB\n\n`;
    });
    
    wx.showModal({
      title: '备份历史',
      content: content,
      showCancel: false,
      confirmText: '知道了'
    });
  },

  // ============ 辅助函数 ============
  
  // 获取默认统计数据
  getDefaultStats: function() {
    const today = new Date();
    const weekStart = this.getWeekStartDate(today);
    
    return {
      week: {
        dateRange: this.formatDateRange(weekStart, this.getWeekEndDate(weekStart)),
        completed: 21,
        rate: 60,
        streak: 3,
        lastUpdate: new Date().toISOString(),
        data: this.generateWeekData()
      },
      month: {
        year: today.getFullYear(),
        month: today.getMonth() + 1,
        total: 65,
        rate: 72,
        perfect: 15,
        avg: 2.8,
        lastUpdate: new Date().toISOString(),
        progress: this.generateMonthProgress(today)
      }
    };
  },

  // 计算真实统计数据
  calculateRealStats: function(projects) {
    const today = new Date();
    const weekStart = this.getWeekStartDate(today);
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    
    // 初始化统计变量
    let weekCompleted = 0;
    let weekTotal = 0;
    let monthCompleted = 0;
    let monthTotal = 0;
    let perfectDays = 0;
    let streakDays = 0;
    
    // 获取打卡记录
    const checkinRecords = wx.getStorageSync('checkin_records') || [];
    
    // 计算本周数据
    const weekData = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const dateStr = this.formatDate(date);
      
      // 获取该日的打卡记录
      const dayRecords = checkinRecords.filter(record => {
        try {
          const recordDate = new Date(record.date);
          return this.formatDate(recordDate) === dateStr;
        } catch (error) {
          return false;
        }
      });
      
      const dayCompleted = dayRecords.length;
      const dayTotal = projects.length;
      
      weekData.push({
        day: this.getDayName(date.getDay()),
        value: dayCompleted,
        total: dayTotal,
        percentage: dayTotal > 0 ? Math.round((dayCompleted / dayTotal) * 100) + '%' : '0%'
      });
      
      weekCompleted += dayCompleted;
      weekTotal += dayTotal;
    }
    
    // 计算本月数据
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const monthProgress = [];
    const dayCounts = {};
    
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      
      // 获取该日的打卡记录
      const dayRecords = checkinRecords.filter(record => {
        try {
          const recordDate = new Date(record.date);
          return this.formatDate(recordDate) === dateStr;
        } catch (error) {
          return false;
        }
      });
      
      const dayCompleted = dayRecords.length;
      const dayTotal = projects.length;
      
      monthProgress.push({
        day: i,
        completed: dayCompleted > 0
      });
      
      if (dayCompleted === dayTotal && dayTotal > 0) {
        perfectDays++;
      }
      
      dayCounts[dateStr] = dayCompleted;
    }
    
    // 计算连续打卡天数
    streakDays = this.calculateStreak(checkinRecords, projects.length);
    
    // 计算月度总计
    const daysPassed = Math.min(today.getDate(), daysInMonth);
    monthCompleted = Object.values(dayCounts).reduce((sum, count) => sum + count, 0);
    monthTotal = projects.length * daysPassed;
    
    return {
      week: {
        dateRange: this.formatDateRange(weekStart, this.getWeekEndDate(weekStart)),
        completed: weekCompleted,
        rate: weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : 0,
        streak: streakDays,
        data: weekData
      },
      month: {
        year: currentYear,
        month: currentMonth,
        total: monthCompleted,
        rate: monthTotal > 0 ? Math.round((monthCompleted / monthTotal) * 100) : 0,
        perfect: perfectDays,
        avg: daysPassed > 0 ? (monthCompleted / daysPassed).toFixed(1) : 0,
        progress: monthProgress
      }
    };
  },

  // 获取周一开始日期
  getWeekStartDate: function(date) {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  },

  // 获取周日结束日期
  getWeekEndDate: function(startDate) {
    const sunday = new Date(startDate);
    sunday.setDate(startDate.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return sunday;
  },

  // 格式化日期范围
  formatDateRange: function(start, end) {
    const startStr = `${start.getMonth() + 1}.${start.getDate()}`;
    const endStr = `${end.getMonth() + 1}.${end.getDate()}`;
    return `${startStr}-${endStr}`;
  },

  // 格式化日期
  formatDate: function(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // 获取星期名称
  getDayName: function(dayIndex) {
    const days = ['日', '一', '二', '三', '四', '五', '六'];
    return days[dayIndex];
  },

  // 生成周数据
  generateWeekData: function() {
    const weekDays = ['一', '二', '三', '四', '五', '六', '日'];
    return weekDays.map((day) => ({
      day,
      value: Math.floor(Math.random() * 5),
      total: 5,
      percentage: Math.floor(Math.random() * 100) + '%'
    }));
  },

  // 生成月进度
  generateMonthProgress: function(today) {
    const progress = [];
    const todayDate = today.getDate();
    
    for (let i = 1; i <= 31; i++) {
      progress.push({
        day: i,
        completed: i <= todayDate && Math.random() > 0.3
      });
    }
    
    return progress;
  },

  // 计算连续打卡天数
  calculateStreak: function(records, totalProjects) {
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 按日期分组
    const recordsByDate = {};
    records.forEach(record => {
      try {
        const date = new Date(record.date);
        const dateStr = date.toISOString().split('T')[0];
        if (!recordsByDate[dateStr]) {
          recordsByDate[dateStr] = 0;
        }
        recordsByDate[dateStr]++;
      } catch (error) {
        // 跳过错误记录
      }
    });
    
    // 从今天往前检查连续天数
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      
      const dayRecords = recordsByDate[dateStr] || 0;
      
      if (dayRecords >= totalProjects) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  },

  // 合并统计数据
  mergeStats: function(defaultStats, realStats) {
    return {
      week: {
        ...defaultStats.week,
        ...realStats.week,
        completed: Math.max(defaultStats.week.completed, realStats.week.completed),
        rate: Math.max(defaultStats.week.rate, realStats.week.rate),
        streak: Math.max(defaultStats.week.streak, realStats.week.streak)
      },
      month: {
        ...defaultStats.month,
        ...realStats.month,
        total: Math.max(defaultStats.month.total, realStats.month.total),
        rate: Math.max(defaultStats.month.rate, realStats.month.rate),
        perfect: Math.max(defaultStats.month.perfect, realStats.month.perfect),
        avg: Math.max(defaultStats.month.avg, realStats.month.avg)
      }
    };
  },

  // ============ 日期更新 ============
  
  updateCurrentDate: function() {
    const now = new Date();
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      weekday: 'long'
    };
    const dateStr = now.toLocaleDateString('zh-CN', options);
    
    this.setData({
      currentDate: dateStr
    });
  },

  setDateRanges: function() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    this.setData({
      weekDateRange: `${weekStart.getMonth() + 1}.${weekStart.getDate()}-${weekEnd.getMonth() + 1}.${weekEnd.getDate()}`,
      monthDateRange: `${year}年${month}月`
    });
  },

  // ============ 音乐播放功能 ============
  initBackgroundAudio: function() {
    try {
      const backgroundAudio = wx.getBackgroundAudioManager();
      console.log('初始化背景音频，但不播放');
      
      backgroundAudio.onPlay(() => {
        console.log('音乐开始播放');
        this.setData({ isPlaying: true });
      });
      
      backgroundAudio.onPause(() => {
        console.log('音乐暂停');
        this.setData({ isPlaying: false });
      });
      
      backgroundAudio.onStop(() => {
        console.log('音乐停止');
        this.setData({ 
          isPlaying: false, 
          musicProgress: 0, 
          currentTime: '0:00' 
        });
      });
      
      backgroundAudio.onEnded(() => {
        console.log('音乐播放结束');
        if (this.data.isPlaying) {
          this.playNextMusic();
        }
      });
      
      backgroundAudio.onTimeUpdate(() => {
        const current = backgroundAudio.currentTime;
        const duration = backgroundAudio.duration;
        
        if (duration > 0) {
          const progress = (current / duration) * 100;
          const currentTime = this.formatMusicTime(current);
          const totalTime = this.formatMusicTime(duration);
          
          this.setData({
            musicProgress: progress,
            currentTime: currentTime,
            duration: totalTime
          });
        }
      });
      
      backgroundAudio.onError((err) => {
        console.error('音乐播放错误:', err);
      });
      
      this.setData({ 
        backgroundAudio: backgroundAudio
      });
      
    } catch (error) {
      console.error('初始化音频失败:', error);
    }
  },

  showMusicPanel: function() {
    this.setData({
      showMusicPanel: true
    });
  },

  hideMusicPanel: function() {
    this.setData({
      showMusicPanel: false
    });
  },

  stopPropagation: function(e) {},

  toggleMusicPlay: function() {
    const backgroundAudio = this.data.backgroundAudio;
    
    if (!backgroundAudio) {
      this.initBackgroundAudio();
      return;
    }
    
    if (this.data.isPlaying) {
      backgroundAudio.pause();
      this.setData({ isPlaying: false });
    } else {
      const currentMusic = this.data.musicList[this.data.currentMusicIndex];
      
      backgroundAudio.title = currentMusic.name;
      backgroundAudio.singer = currentMusic.artist;
      backgroundAudio.src = currentMusic.url;
      backgroundAudio.volume = this.data.volume / 100;
      
      backgroundAudio.play();
      
      this.setData({ 
        isPlaying: true,
        currentTime: '0:00',
        musicProgress: 0
      });
    }
  },

  playPrevMusic: function() {
    let newIndex = this.data.currentMusicIndex - 1;
    if (newIndex < 0) {
      newIndex = this.data.musicList.length - 1;
    }
    
    if (this.data.backgroundAudio) {
      this.data.backgroundAudio.stop();
    }
    
    this.setData({
      currentMusicIndex: newIndex,
      isPlaying: false,
      currentTime: '0:00',
      musicProgress: 0
    });
    
    if (this.data.isPlaying) {
      setTimeout(() => {
        this.toggleMusicPlay();
      }, 100);
    }
  },

  playNextMusic: function() {
    let newIndex;
    if (this.data.isRandom) {
      newIndex = Math.floor(Math.random() * this.data.musicList.length);
      while (newIndex === this.data.currentMusicIndex && this.data.musicList.length > 1) {
        newIndex = Math.floor(Math.random() * this.data.musicList.length);
      }
    } else {
      newIndex = this.data.currentMusicIndex + 1;
      if (newIndex >= this.data.musicList.length) {
        newIndex = 0;
      }
    }
    
    if (this.data.backgroundAudio) {
      this.data.backgroundAudio.stop();
    }
    
    this.setData({
      currentMusicIndex: newIndex,
      isPlaying: false,
      currentTime: '0:00',
      musicProgress: 0
    });
    
    if (this.data.isPlaying) {
      setTimeout(() => {
        this.toggleMusicPlay();
      }, 100);
    }
  },

  selectMusic: function(e) {
    const index = e.currentTarget.dataset.index;
    
    if (!this.data.showSongList) {
      this.setData({
        showSongList: true
      });
      
      setTimeout(() => {
        this.switchMusic(index);
      }, 300);
    } else {
      this.switchMusic(index);
    }
  },

  switchMusic: function(index) {
    if (this.data.backgroundAudio) {
      this.data.backgroundAudio.stop();
    }
    
    this.setData({
      currentMusicIndex: index,
      musicProgress: 0,
      currentTime: '0:00',
      isPlaying: false
    });
    
    if (this.data.isPlaying) {
      setTimeout(() => {
        this.toggleMusicPlay();
      }, 200);
    }
  },

  onVolumeChange: function(e) {
    const volume = e.detail.value;
    const backgroundAudio = this.data.backgroundAudio;
    
    if (backgroundAudio) {
      backgroundAudio.volume = volume / 100;
    }
    
    this.setData({
      volume: volume
    });
  },

  onProgressChanging: function(e) {
    const progress = e.detail.value;
    const backgroundAudio = this.data.backgroundAudio;
    
    if (backgroundAudio && backgroundAudio.duration > 0) {
      const newTime = (progress / 100) * backgroundAudio.duration;
      backgroundAudio.seek(newTime);
    }
  },

  toggleSongList: function() {
    this.setData({
      showSongList: !this.data.showSongList
    });
  },

  toggleRandomPlay: function() {
    const newRandomState = !this.data.isRandom;
    this.setData({
      isRandom: newRandomState
    });
  },

  formatMusicTime: function(seconds) {
    if (isNaN(seconds) || seconds < 0) {
      return '0:00';
    }
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }
});