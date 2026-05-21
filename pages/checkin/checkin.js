// pages/checkin/checkin.js
const storage = require('../../utils/storage.js');

Page({
  data: {
    // 项目信息
    projectId: '',
    projectName: '',
    projectColor: '#1890ff',
    
    // 当前日期信息
    currentYear: 0,
    currentMonth: 0,
    currentDay: 0,
    todayDateStr: '', // 新增：今天的日期字符串
    
    // 日历数据
    calendarDays: [],
    
    // 签到数据
    checkInDays: [],
    todayCheckinTime: '',
    
    // 统计信息
    points: 0,
    consecutiveDays: 0,
    totalDays: 0,
    completionRate: 0,
    
    // 状态
    isCheckedIn: false,
    checkinTip: '',
    showMonth: '',
    animateClass: '',
    isCompleted: false,
    completedTip: '',
    buttonStyle: 'default',
    
    // 项目统计
    stats: {
      points: 0,
      consecutiveDays: 0,
      totalDays: 0,
      completionRate: 0
    }
  },

  onLoad: function(options) {
    console.log('打卡页面加载，参数:', options);
    
    // 获取项目信息
    this.setData({
      projectId: parseInt(options.projectId) || '',
      projectName: decodeURIComponent(options.projectName || ''),
      projectColor: decodeURIComponent(options.projectColor || '#1890ff')
    });
    
    this.initCurrentDate();
    this.loadProjectData();
    this.generateCalendar();
  },

  onShow: function() {
    console.log('页面显示，重新检查状态');
    this.checkTodayStatus();
  },

  // 初始化当前日期
  initCurrentDate: function() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const todayDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    this.setData({
      currentYear: year,
      currentMonth: month,
      currentDay: day,
      todayDateStr: todayDateStr,
      showMonth: `${year}年${month}月`
    });
    
    console.log('初始化日期:', todayDateStr);
  },

  // 加载项目数据
  loadProjectData: function() {
    const { projectId, todayDateStr } = this.data;
    
    if (!projectId) {
      console.error('项目ID为空');
      return;
    }
    
    console.log('加载项目数据，项目ID:', projectId, '今天日期:', todayDateStr);
    
    // 获取项目数据
    const projects = storage.getProjects();
    const project = projects.find(p => p.id === projectId);
    
    if (!project) {
      console.error('项目不存在:', projectId);
      wx.showToast({
        title: '项目不存在',
        icon: 'none'
      });
      return;
    }
    
    // 获取统计数据
    const stats = storage.getProjectStats(projectId);
    console.log('项目统计:', stats);
    
    // 获取所有打卡记录
    const checkinRecords = storage.getProjectCheckins(projectId);
    console.log('原始打卡记录数量:', checkinRecords.length);
    
    // 提取日期字符串
    const checkInDays = [];
    let todayCheckinTime = '';
    let hasCheckedToday = false;
    
    checkinRecords.forEach(record => {
      if (record && record.date) {
        try {
          const dateObj = new Date(record.date);
          const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
          
          // 添加到签到日期列表
          if (!checkInDays.includes(dateStr)) {
            checkInDays.push(dateStr);
          }
          
          // 检查是否是今天的签到记录
          if (dateStr === todayDateStr) {
            hasCheckedToday = true;
            // 获取签到时间
            const hours = dateObj.getHours().toString().padStart(2, '0');
            const minutes = dateObj.getMinutes().toString().padStart(2, '0');
            todayCheckinTime = `${hours}:${minutes}`;
            console.log('找到今天签到记录，时间:', todayCheckinTime);
          }
        } catch (e) {
          console.error('日期解析错误:', record, e);
        }
      }
    });
    
    // 按日期排序
    checkInDays.sort();
    
    // 检查项目是否已完成
    const isCompleted = stats.completionRate >= 100;
    const completedTip = isCompleted ? `🎉 目标已完成 (${project.targetDays}天)` : '';
    
    console.log('状态检查:', {
      todayDateStr: todayDateStr,
      hasCheckedToday: hasCheckedToday,
      todayCheckinTime: todayCheckinTime,
      checkInDays: checkInDays.length
    });
    
    // 更新按钮状态 - 确保已签到状态保持蓝色
    this.setData({
      projectName: project.name,
      checkInDays: checkInDays,
      todayCheckinTime: todayCheckinTime,
      points: stats.points || 0,
      consecutiveDays: stats.consecutiveDays || 0,
      totalDays: stats.totalDays || 0,
      completionRate: stats.completionRate || 0,
      isCompleted: isCompleted,
      completedTip: completedTip,
      isCheckedIn: hasCheckedToday,
      buttonStyle: hasCheckedToday ? 'checked' : (isCompleted ? 'completed' : 'default'),
      stats: stats
    }, () => {
      // 更新签到提示
      this.updateCheckinTip();
      console.log('数据加载完成，按钮状态:', this.data.buttonStyle);
    });
    
    // 设置导航栏标题
    wx.setNavigationBarTitle({
      title: this.data.projectName
    });
  },

  // 更新签到提示
  updateCheckinTip: function() {
    const { isCompleted, isCheckedIn, todayCheckinTime, buttonStyle } = this.data;
    
    let checkinTip = '';
    if (isCompleted) {
      checkinTip = '🎉 目标已完成';
    } else if (isCheckedIn) {
      checkinTip = todayCheckinTime ? `已签到 (${todayCheckinTime})` : '今日已签到';
    } else {
      checkinTip = '点击签到';
    }
    
    console.log('更新签到提示:', { isCompleted, isCheckedIn, todayCheckinTime, checkinTip, buttonStyle });
    
    this.setData({
      checkinTip: checkinTip
    });
  },

  // 检查今日签到状态
  checkTodayStatus: function() {
    const today = `${this.data.currentYear}-${String(this.data.currentMonth).padStart(2, '0')}-${String(this.data.currentDay).padStart(2, '0')}`;
    const isChecked = this.data.checkInDays.includes(today);
    
    console.log('检查今天状态:', { today, isChecked, checkInDays: this.data.checkInDays });
    
    this.setData({
      isCheckedIn: isChecked,
      buttonStyle: isChecked ? 'checked' : (this.data.isCompleted ? 'completed' : 'default')
    }, () => {
      this.updateCheckinTip();
      console.log('状态检查完成，按钮状态:', this.data.buttonStyle);
    });
  },

  // 生成日历
  generateCalendar: function() {
    const { currentYear, currentMonth, checkInDays } = this.data;
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
    
    const calendarDays = [];
    
    // 上个月的空格
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push({
        day: '',
        isCurrentMonth: false,
        isToday: false,
        isChecked: false
      });
    }
    
    // 当前月的日期
    const todayStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(this.data.currentDay).padStart(2, '0')}`;
    for (let i = 1; i <= daysInMonth; i++) {
      const dayStr = String(i).padStart(2, '0');
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${dayStr}`;
      const isChecked = checkInDays.includes(dateStr);
      const isToday = dateStr === todayStr;
      
      calendarDays.push({
        day: i,
        isCurrentMonth: true,
        isToday: isToday,
        isChecked: isChecked,
        dateStr: dateStr
      });
    }
    
    this.setData({ calendarDays });
  },

  // 签到函数 - 确保按钮保持蓝色
  handleCheckin: function() {
    const { projectId, isCompleted, isCheckedIn, todayDateStr } = this.data;
    
    console.log('开始签到处理:', { 
      projectId, 
      isCompleted, 
      isCheckedIn,
      todayDateStr,
      currentTime: new Date().toLocaleString()
    });
    
    // 1. 如果项目已完成，不允许打卡
    if (isCompleted) {
      wx.showToast({
        title: '🎉 目标已完成，无需继续打卡',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 2. 如果今天已经打卡过了
    if (isCheckedIn) {
      wx.showToast({
        title: '今日已签到，请明天再来',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    if (!projectId) {
      wx.showToast({
        title: '项目信息错误',
        icon: 'error'
      });
      return;
    }
    
    console.log('开始打卡，项目ID:', projectId);
    
    // 动画效果
    this.setData({ 
      animateClass: 'animate',
      buttonStyle: 'checking'
    });
    
    // 调用storage.js的打卡方法
    console.log('调用storage.addCheckinRecord...');
    const success = storage.addCheckinRecord(projectId);
    
    console.log('storage.addCheckinRecord结果:', success);
    
    if (success) {
      console.log('打卡成功');
      
      // 获取当前时间
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const todayCheckinTime = `${hours}:${minutes}`;
      
      // 立即更新按钮状态为蓝色
      this.setData({
        isCheckedIn: true,
        buttonStyle: 'checked', // 设置为已签到状态（蓝色）
        todayCheckinTime: todayCheckinTime,
        animateClass: 'success'
      }, () => {
        console.log('按钮状态已更新为蓝色');
      });
      
      // 将今天的日期添加到签到列表中
      const updatedCheckInDays = [...this.data.checkInDays, todayDateStr];
      updatedCheckInDays.sort();
      
      // 更新本地签到数据
      this.setData({
        checkInDays: updatedCheckInDays
      });
      
      // 更新统计数据
      setTimeout(() => {
        const stats = storage.getProjectStats(projectId);
        this.setData({
          points: stats.points || 0,
          consecutiveDays: stats.consecutiveDays || 0,
          totalDays: stats.totalDays || 0,
          completionRate: stats.completionRate || 0
        });
        
        // 更新签到提示
        this.updateCheckinTip();
        
        // 重新生成日历（可选）
        this.generateCalendar();
        
        console.log('数据更新完成，按钮状态保持为:', this.data.buttonStyle);
      }, 300);
      
      // 显示成功提示
      wx.showToast({
        title: '签到成功！+10积分',
        icon: 'success',
        duration: 2000
      });
      
      // 显示连续签到奖励
      setTimeout(() => {
        const stats = storage.getProjectStats(projectId);
        const consecutiveDays = stats.consecutiveDays || 0;
        
        if (consecutiveDays > 0) {
          if (consecutiveDays % 7 === 0) {
            wx.showModal({
              title: '🎉 恭喜！',
              content: `连续签到${consecutiveDays}天，额外奖励30积分！`,
              showCancel: false,
              confirmText: '太棒了'
            });
          } else if (consecutiveDays % 3 === 0) {
            wx.showModal({
              title: '🎉 恭喜！',
              content: `连续签到${consecutiveDays}天，额外奖励15积分！`,
              showCancel: false,
              confirmText: '太好了'
            });
          }
        }
      }, 600);
      
    } else {
      console.log('打卡失败');
      
      // 如果打卡失败，重新检查今天的状态
      this.loadProjectData();
      
      wx.showToast({
        title: '今日已签到或打卡失败',
        icon: 'none',
        duration: 2000
      });
      
      // 重置按钮状态
      this.setData({ 
        animateClass: '',
        buttonStyle: 'default'
      });
    }
  },

  // 其他函数保持不变...
  prevMonth: function() {
    let { currentYear, currentMonth } = this.data;
    if (currentMonth === 1) {
      currentYear--;
      currentMonth = 12;
    } else {
      currentMonth--;
    }
    
    this.setData({
      currentYear,
      currentMonth,
      showMonth: `${currentYear}年${currentMonth}月`
    }, () => {
      this.generateCalendar();
    });
  },

  nextMonth: function() {
    let { currentYear, currentMonth } = this.data;
    if (currentMonth === 12) {
      currentYear++;
      currentMonth = 1;
    } else {
      currentMonth++;
    }
    
    this.setData({
      currentYear,
      currentMonth,
      showMonth: `${currentYear}年${currentMonth}月`
    }, () => {
      this.generateCalendar();
    });
  },

  goToday: function() {
    this.initCurrentDate();
    this.generateCalendar();
  },

  viewRules: function() {
    wx.showModal({
      title: '签到规则',
      content: `📋 签到规则说明：

✅ 每日只能签到一次
✅ 每次签到获得10积分
✅ 连续签到3天额外奖励15积分
✅ 连续签到7天额外奖励30积分
✅ 积分可用于兑换奖励

⛔ 注意事项：
• 目标完成后将无法继续打卡
• 签到记录每天24点重置
• 请勿重复签到

🎯 坚持打卡，养成好习惯！`,
      showCancel: false,
      confirmText: '明白了'
    });
  },

  viewProjectDetail: function() {
    wx.navigateTo({
      url: `/pages/project-detail/project-detail?projectId=${this.data.projectId}`
    });
  },

  goBackToProjects: function() {
    wx.navigateBack();
  },

  onShareAppMessage: function() {
    return {
      title: `${this.data.projectName} - 打卡项目`,
      path: `/pages/checkin/checkin?projectId=${this.data.projectId}&projectName=${encodeURIComponent(this.data.projectName)}`
    };
  }
});