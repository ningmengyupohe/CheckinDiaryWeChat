// utils/storage.js
const STORAGE_KEY = 'projects';
const CHECKIN_KEY = 'checkin_records';

module.exports = {
  // 获取所有项目（不验证用户ID）
  getProjects: function() {
    try {
      const projects = wx.getStorageSync(STORAGE_KEY) || [];
      console.log('获取所有项目:', projects.length);
      return projects;
    } catch (error) {
      console.error('获取项目失败:', error);
      return [];
    }
  },

  // 创建新项目（只检查是否登录）
  createProject: function(project) {
    try {
      console.log('=== 开始创建项目 ===');
      
      // 只检查是否有用户信息
      const currentUser = wx.getStorageSync('userInfo') || {};
      if (!currentUser || Object.keys(currentUser).length === 0) {
        console.log('用户信息为空');
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        });
        return false;
      }
      
      const projects = wx.getStorageSync(STORAGE_KEY) || [];
      
      // 为新项目添加必要信息
      const newProject = {
        ...project,
        createdAt: new Date().toISOString(),
        status: 'active'
      };
      
      // 确保有必需的字段
      if (!newProject.id) {
        newProject.id = Date.now();
      }
      
      if (!newProject.color) {
        const colors = ['#1890ff', '#52c41a', '#fa8c16', '#f5222d', '#722ed1'];
        newProject.color = colors[Math.floor(Math.random() * colors.length)];
      }
      
      if (!newProject.icon) {
        const icons = ['🏃', '📖', '💧', '🏋️', '🧘'];
        newProject.icon = icons[Math.floor(Math.random() * icons.length)];
      }
      
      console.log('准备保存的项目:', newProject);
      
      projects.push(newProject);
      wx.setStorageSync(STORAGE_KEY, projects);
      
      console.log('保存项目成功，总数:', projects.length);
      return true;
      
    } catch (error) {
      console.error('创建项目失败:', error);
      wx.showToast({
        title: '创建失败',
        icon: 'error'
      });
      return false;
    }
  },

  // 获取项目统计（不需要用户验证）
  getProjectStats: function(projectId) {
    console.log('=== 获取项目统计，ID:', projectId, '===');
    
    try {
      // 获取所有打卡记录 - 确保是数组
      let allRecords = wx.getStorageSync(CHECKIN_KEY);
      if (!allRecords || !Array.isArray(allRecords)) {
        console.log('打卡记录不存在或不是数组，初始化为空数组');
        allRecords = [];
      }
      
      console.log('所有打卡记录总数:', allRecords.length);
      
      // 过滤出当前项目的打卡记录（不区分用户）
      const projectRecords = allRecords.filter(record => {
        if (!record || typeof record !== 'object') {
          console.warn('无效的记录格式:', record);
          return false;
        }
        
        // 检查项目ID是否匹配
        return String(record.projectId) === String(projectId);
      });
      
      console.log('项目打卡记录数:', projectRecords.length);
      
      // 如果没有打卡记录
      if (projectRecords.length === 0) {
        console.log('没有打卡记录，返回默认统计');
        return {
          totalDays: 0,
          consecutiveDays: 0,
          points: 0,
          completionRate: 0,
          targetDays: 0
        };
      }
      
      // 处理日期：标准化所有日期为 YYYY-MM-DD 格式
      const dateMap = new Map(); // 用于去重，同一天只算一次
      
      projectRecords.forEach(record => {
        try {
          let dateStr = '';
          
          // 优先使用 localDate 字段
          if (record.localDate && typeof record.localDate === 'string') {
            const match = record.localDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (match) {
              dateStr = `${match[1]}-${match[2]}-${match[3]}`;
            }
          }
          
          // 如果没有 localDate，尝试从 date 字段解析
          if (!dateStr && record.date) {
            const dateObj = new Date(record.date);
            if (!isNaN(dateObj.getTime())) {
              const year = dateObj.getFullYear();
              const month = dateObj.getMonth() + 1;
              const day = dateObj.getDate();
              dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            }
          }
          
          // 如果还是没有，使用 timestamp
          if (!dateStr && record.timestamp) {
            const dateObj = new Date(record.timestamp);
            const year = dateObj.getFullYear();
            const month = dateObj.getMonth() + 1;
            const day = dateObj.getDate();
            dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
          }
          
          if (dateStr) {
            dateMap.set(dateStr, true);
            console.log('标准化日期:', dateStr, '来自记录:', record);
          } else {
            console.warn('无法解析日期，记录:', record);
          }
        } catch (error) {
          console.error('处理日期时出错:', error, '记录:', record);
        }
      });
      
      // 获取所有不重复的打卡日期
      const uniqueDates = Array.from(dateMap.keys()).sort().reverse(); // 从新到旧排序
      console.log('去重后的打卡日期:', uniqueDates);
      
      // 计算总打卡天数
      const totalDays = uniqueDates.length;
      
      // 计算连续打卡天数
      let consecutiveDays = 0;
      
      if (uniqueDates.length > 0) {
        // 获取今天的日期
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
        
        // 获取昨天的日期
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = `${yesterday.getFullYear()}-${(yesterday.getMonth() + 1).toString().padStart(2, '0')}-${yesterday.getDate().toString().padStart(2, '0')}`;
        
        console.log('今天:', todayStr);
        console.log('昨天:', yesterdayStr);
        console.log('最新打卡日期:', uniqueDates[0]);
        
        // 检查最新打卡日期是否是今天或昨天
        const latestDate = uniqueDates[0];
        
        // 简单算法：如果最新打卡是今天或昨天，则从最新日期开始向前检查连续性
        if (latestDate === todayStr || latestDate === yesterdayStr) {
          consecutiveDays = 1; // 至少有一天
          
          // 从第二天开始检查
          for (let i = 1; i < uniqueDates.length; i++) {
            const currentDate = uniqueDates[i - 1];
            const prevDate = uniqueDates[i];
            
            // 将日期字符串转换为 Date 对象进行比较
            const currentDateObj = new Date(currentDate);
            const prevDateObj = new Date(prevDate);
            
            // 计算日期差
            const diffTime = currentDateObj.getTime() - prevDateObj.getTime();
            const diffDays = diffTime / (1000 * 60 * 60 * 24);
            
            console.log(`检查连续性: ${currentDate} - ${prevDate} = ${diffDays} 天`);
            
            if (diffDays === 1) {
              consecutiveDays++;
            } else {
              break; // 日期不连续，停止检查
            }
          }
        } else {
          // 最新打卡不是今天也不是昨天，没有连续
          consecutiveDays = 0;
        }
      }
      
      // 计算积分（每次打卡10分）
      const points = totalDays * 10;
      
      // 获取项目信息来计算完成度
      const projects = this.getProjects();
      const project = projects.find(p => String(p.id) === String(projectId));
      
      // 计算完成度
      let completionRate = 0;
      let targetDays = 0;
      if (project) {
        targetDays = project.targetDays || 0;
        if (targetDays > 0) {
          completionRate = Math.min(Math.round((totalDays / targetDays) * 100), 100);
        }
      }
      
      const stats = {
        consecutiveDays: consecutiveDays,
        points: points,
        completionRate: completionRate,
        totalDays: totalDays,
        targetDays: targetDays
      };
      
      console.log('=== 项目统计结果 ===', stats);
      return stats;
    } catch (error) {
      console.error('获取项目统计失败:', error);
      return {
        consecutiveDays: 0,
        points: 0,
        completionRate: 0,
        totalDays: 0,
        targetDays: 0
      };
    }
  },

  // 更新项目（不需要用户验证）
  updateProject: function(projectId, data) {
    try {
      const projects = wx.getStorageSync(STORAGE_KEY) || [];
      const index = projects.findIndex(p => String(p.id) === String(projectId));
      
      if (index !== -1) {
        projects[index] = { ...projects[index], ...data };
        wx.setStorageSync(STORAGE_KEY, projects);
        return true;
      }
      
      wx.showToast({
        title: '项目不存在',
        icon: 'none'
      });
      return false;
    } catch (error) {
      console.error('更新项目失败:', error);
      return false;
    }
  },

  // 删除项目（不需要用户验证）
  deleteProject: function(projectId) {
    try {
      // 获取所有项目
      const allProjects = wx.getStorageSync(STORAGE_KEY) || [];
      
      // 删除项目
      const filteredProjects = allProjects.filter(p => {
        return String(p.id) !== String(projectId);
      });
      
      wx.setStorageSync(STORAGE_KEY, filteredProjects);
      
      // 同时删除该项目的打卡记录
      const allCheckinRecords = wx.getStorageSync(CHECKIN_KEY) || [];
      const filteredCheckins = allCheckinRecords.filter(record => {
        if (!record || typeof record !== 'object') return false;
        return String(record.projectId) !== String(projectId);
      });
      
      wx.setStorageSync(CHECKIN_KEY, filteredCheckins);
      
      console.log('删除项目成功，剩余项目数:', filteredProjects.length, '剩余记录数:', filteredCheckins.length);
      
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      });
      return true;
    } catch (error) {
      console.error('删除项目失败:', error);
      return false;
    }
  },

  // 设置当前项目
  setCurrentProject: function(projectId) {
    try {
      wx.setStorageSync('currentProjectId', projectId);
      return true;
    } catch (error) {
      console.error('设置当前项目失败:', error);
      return false;
    }
  },

  // 打卡记录相关方法（只检查是否登录）
  addCheckinRecord: function(projectId) {
    try {
      console.log('=== 添加打卡记录，项目ID:', projectId, '===');
      
      // 只检查是否有用户信息
      const currentUser = wx.getStorageSync('userInfo') || {};
      if (!currentUser || Object.keys(currentUser).length === 0) {
        console.log('用户信息为空');
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        });
        return false;
      }
      
      // 获取现有的打卡记录 - 确保是数组
      let records = wx.getStorageSync(CHECKIN_KEY);
      if (!records || !Array.isArray(records)) {
        console.log('打卡记录不存在，初始化为空数组');
        records = [];
      }
      
      const now = new Date();
      
      // 获取本地时间
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const day = now.getDate();
      const hour = now.getHours();
      const minute = now.getMinutes();
      const second = now.getSeconds();
      
      // 创建本地时间的日期字符串
      const dateOnlyStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`;
      const localDateTimeStr = `${dateOnlyStr} ${timeStr}`;
      
      console.log('今天的日期:', dateOnlyStr);
      console.log('当前时间:', timeStr);
      
      // 检查今天是否已经打卡（不区分用户，只检查项目）
      const alreadyCheckedIn = records.some(record => {
        if (!record || typeof record !== 'object') return false;
        if (String(record.projectId) !== String(projectId)) return false;
        
        try {
          // 优先检查 localDate
          if (record.localDate) {
            const match = record.localDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (match) {
              const recordDateStr = `${match[1]}-${match[2]}-${match[3]}`;
              if (recordDateStr === dateOnlyStr) {
                console.log('发现今天已打卡的记录:', record);
                return true;
              }
            }
          }
          
          // 如果 localDate 没有，检查 date 字段
          if (record.date) {
            const dateObj = new Date(record.date);
            if (!isNaN(dateObj.getTime())) {
              const recordYear = dateObj.getFullYear();
              const recordMonth = dateObj.getMonth() + 1;
              const recordDay = dateObj.getDate();
              const recordDateStr = `${recordYear}-${recordMonth.toString().padStart(2, '0')}-${recordDay.toString().padStart(2, '0')}`;
              
              if (recordDateStr === dateOnlyStr) {
                console.log('发现今天已打卡的记录（从date字段）:', record);
                return true;
              }
            }
          }
        } catch (e) {
          console.error('检查打卡记录时出错:', e);
        }
        
        return false;
      });
      
      if (alreadyCheckedIn) {
        console.log('今天已经打卡过了');
        wx.showToast({
          title: '今天已打卡',
          icon: 'none'
        });
        return false;
      }
      
      // 创建新的打卡记录
      const newRecord = {
        id: Date.now(),
        projectId: projectId,
        date: now.toISOString(), // 保存 ISO 格式时间
        timestamp: Date.now(),
        localDate: localDateTimeStr, // 保存本地时间字符串
        localHour: hour // 保存本地小时
      };
      
      records.push(newRecord);
      wx.setStorageSync(CHECKIN_KEY, records);
      
      console.log('打卡记录添加成功，总记录数:', records.length);
      console.log('新记录详情:', newRecord);
      
      wx.showToast({
        title: '打卡成功',
        icon: 'success'
      });
      return true;
    } catch (error) {
      console.error('添加打卡记录失败:', error);
      return false;
    }
  },

  // 获取项目的打卡记录（不区分用户）
  getProjectCheckins: function(projectId) {
    try {
      console.log('获取项目打卡记录，ID:', projectId);
      
      // 获取现有的打卡记录 - 确保是数组
      let records = wx.getStorageSync(CHECKIN_KEY);
      if (!records || !Array.isArray(records)) {
        console.log('打卡记录不存在，返回空数组');
        return [];
      }
      
      // 过滤出当前项目的打卡记录
      const projectRecords = records.filter(record => {
        if (!record || typeof record !== 'object') return false;
        return String(record.projectId) === String(projectId);
      });
      
      console.log('找到项目打卡记录:', projectRecords.length, '条');
      return projectRecords;
    } catch (error) {
      console.error('获取打卡记录失败:', error);
      return [];
    }
  },

  // 获取所有项目的统计摘要
  getProjectsSummary: function() {
    try {
      const projects = this.getProjects();
      const summary = projects.map(project => {
        const stats = this.getProjectStats(project.id);
        return {
          ...project,
          stats: stats
        };
      });
      return summary;
    } catch (error) {
      console.error('获取项目摘要失败:', error);
      return [];
    }
  },

  // 获取最近一次打卡记录
  getLastCheckin: function(projectId) {
    try {
      const records = this.getProjectCheckins(projectId);
      if (records.length === 0) {
        return null;
      }
      
      // 按日期排序，最新的在前面
      const sortedRecords = records.sort((a, b) => {
        try {
          return (b.timestamp || b.id || 0) - (a.timestamp || a.id || 0);
        } catch (e) {
          return 0;
        }
      });
      
      return sortedRecords[0];
    } catch (error) {
      console.error('获取最近打卡记录失败:', error);
      return null;
    }
  },

  // 初始化打卡记录存储
  initCheckinRecords: function() {
    try {
      const records = wx.getStorageSync(CHECKIN_KEY);
      if (!records) {
        console.log('初始化打卡记录存储');
        wx.setStorageSync(CHECKIN_KEY, []);
        return true;
      }
      return true;
    } catch (error) {
      console.error('初始化打卡记录失败:', error);
      return false;
    }
  },

  // 调试函数：显示打卡记录详情
  debugCheckinRecords: function(projectId) {
    try {
      console.log('=== 调试打卡记录 ===');
      console.log('项目ID:', projectId);
      
      const records = wx.getStorageSync(CHECKIN_KEY) || [];
      console.log('总记录数:', records.length);
      
      const projectRecords = records.filter(record => {
        if (!record || typeof record !== 'object') return false;
        return String(record.projectId) === String(projectId);
      });
      
      console.log('本项目记录数:', projectRecords.length);
      
      projectRecords.forEach((record, index) => {
        console.log(`记录 ${index + 1}:`, {
          id: record.id,
          date: record.date,
          timestamp: record.timestamp,
          localDate: record.localDate,
          localHour: record.localHour,
          projectId: record.projectId
        });
      });
      
      return projectRecords;
    } catch (error) {
      console.error('调试失败:', error);
      return [];
    }
  },

  // 重置所有数据（用于测试）
  resetAllData: function() {
    try {
      wx.removeStorageSync(STORAGE_KEY);
      wx.removeStorageSync(CHECKIN_KEY);
      wx.removeStorageSync('currentProjectId');
      console.log('所有数据已重置');
      return true;
    } catch (error) {
      console.error('重置数据失败:', error);
      return false;
    }
  },

  // 获取所有项目（与getProjects功能相同，保持兼容性）
  getAllProjects: function() {
    try {
      const projects = wx.getStorageSync(STORAGE_KEY) || [];
      console.log('获取所有项目:', projects.length);
      return projects;
    } catch (error) {
      console.error('获取所有项目失败:', error);
      return [];
    }
  },

  // 获取所有打卡记录
  getAllCheckinRecords: function() {
    try {
      const records = wx.getStorageSync(CHECKIN_KEY) || [];
      console.log('获取所有打卡记录:', records.length);
      return records;
    } catch (error) {
      console.error('获取所有打卡记录失败:', error);
      return [];
    }
  },

  // 检查是否登录（简化的登录检查）
  checkLogin: function() {
    try {
      const currentUser = wx.getStorageSync('userInfo') || {};
      const isLoggedIn = currentUser && Object.keys(currentUser).length > 0;
      console.log('登录检查:', isLoggedIn);
      return isLoggedIn;
    } catch (error) {
      console.error('检查登录状态失败:', error);
      return false;
    }
  }
};