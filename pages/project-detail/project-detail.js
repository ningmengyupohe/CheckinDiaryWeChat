// pages/project-detail/project-detail.js
const storage = require('../../utils/storage.js');

Page({
  data: {
    projectId: '',
    project: null,
    projectData: null,
    stats: null,
    activeTab: 'overview', // overview, calendar, records, settings
    monthlyData: [],
    selectedYear: new Date().getFullYear(),
    selectedMonth: new Date().getMonth() + 1,
    records: [],
    showExportModal: false,
    showDeleteConfirm: false
  },

  onLoad: function(options) {
    const projectId = options.projectId;
    if (!projectId) {
      wx.navigateBack();
      return;
    }

    this.setData({ projectId });
    this.loadProjectData();
  },

  // 加载项目数据
  loadProjectData: function() {
    const { projectId } = this.data;
    
    // 获取项目信息
    const projects = storage.getProjects();
    const project = projects.find(p => p.id === projectId);
    
    if (!project) {
      wx.showToast({
        title: '项目不存在',
        icon: 'error'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    // 获取项目数据和统计
    const projectData = storage.getProjectData(projectId);
    const stats = storage.getProjectStats(projectId);
    const monthlyData = storage.getMonthlyStats(projectId, this.data.selectedYear, this.data.selectedMonth);

    this.setData({
      project,
      projectData,
      stats,
      monthlyData,
      records: this.getRecentRecords(projectData)
    });

    // 设置导航栏标题
    wx.setNavigationBarTitle({
      title: project.name
    });
  },

  // 获取最近记录
  getRecentRecords: function(projectData) {
    const records = [];
    const today = new Date();
    
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      if (projectData.dailyRecords && projectData.dailyRecords[dateStr]) {
        records.push({
          date: dateStr,
          ...projectData.dailyRecords[dateStr]
        });
      }
    }
    
    return records;
  },

  // 切换标签页
  switchTab: function(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
    
    if (tab === 'calendar') {
      this.loadCalendarData();
    } else if (tab === 'records') {
      this.loadRecords();
    }
  },

  // 加载日历数据
  loadCalendarData: function() {
    const { projectId, selectedYear, selectedMonth } = this.data;
    const monthlyData = storage.getMonthlyStats(projectId, selectedYear, selectedMonth);
    this.setData({ monthlyData });
  },

  // 上一个月
  prevMonth: function() {
    let { selectedYear, selectedMonth } = this.data;
    
    if (selectedMonth === 1) {
      selectedYear--;
      selectedMonth = 12;
    } else {
      selectedMonth--;
    }
    
    this.setData({
      selectedYear,
      selectedMonth
    }, () => {
      this.loadCalendarData();
    });
  },

  // 下一个月
  nextMonth: function() {
    let { selectedYear, selectedMonth } = this.data;
    
    if (selectedMonth === 12) {
      selectedYear++;
      selectedMonth = 1;
    } else {
      selectedMonth++;
    }
    
    this.setData({
      selectedYear,
      selectedMonth
    }, () => {
      this.loadCalendarData();
    });
  },

  // 加载记录
  loadRecords: function() {
    const { projectData } = this.data;
    const records = this.getRecentRecords(projectData);
    this.setData({ records });
  },

  // 导出数据
  exportData: function() {
    const { projectId } = this.data;
    const exportData = storage.exportProjectData(projectId);
    
    // 转换为JSON字符串
    const dataStr = JSON.stringify(exportData, null, 2);
    
    // 保存到文件
    wx.showLoading({
      title: '导出中...'
    });
    
    setTimeout(() => {
      wx.setClipboardData({
        data: dataStr,
        success: () => {
          wx.hideLoading();
          wx.showToast({
            title: '已复制到剪贴板',
            icon: 'success'
          });
          
          this.setData({
            showExportModal: true
          });
        },
        fail: () => {
          wx.hideLoading();
          wx.showToast({
            title: '导出失败',
            icon: 'error'
          });
        }
      });
    }, 500);
  },

  // 关闭导出模态框
  closeExportModal: function() {
    this.setData({ showExportModal: false });
  },

  // 显示删除确认
  showDeleteConfirm: function() {
    this.setData({ showDeleteConfirm: true });
  },

  // 关闭删除确认
  closeDeleteConfirm: function() {
    this.setData({ showDeleteConfirm: false });
  },

  // 删除项目
  deleteProject: function() {
    const { projectId } = this.data;
    
    storage.deleteProject(projectId);
    
    wx.showToast({
      title: '删除成功',
      icon: 'success'
    });
    
    setTimeout(() => {
      wx.navigateBack();
    }, 1000);
  },

  // 编辑项目
  editProject: function() {
    const { projectId } = this.data;
    wx.navigateTo({
      url: `/pages/projects/projects?edit=${projectId}`
    });
  },

  // 返回打卡页面
  goToCheckin: function() {
    const { projectId, project } = this.data;
    wx.navigateTo({
      url: `/pages/checkin/checkin?projectId=${projectId}&projectName=${encodeURIComponent(project.name)}&projectColor=${encodeURIComponent(project.color)}`
    });
  },

  // 分享项目
  onShareAppMessage: function() {
    const { project } = this.data;
    return {
      title: `${project.name} - 打卡项目`,
      path: `/pages/checkin/checkin?projectId=${project.id}&projectName=${encodeURIComponent(project.name)}`
    };
  }
});