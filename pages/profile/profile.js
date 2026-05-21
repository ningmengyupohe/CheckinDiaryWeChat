// pages/profile/profile.js
Page({
    data: {
      continuousDays: 0,
      isLoggedIn: false,
      userInfo: {
        nickname: '请登录',
        avatar: '/images/default-avatar.png',
        stats: {
          projects: 0,
          completionRate: '0%',
          badges: 0,
          checkinDays: 0
        }
      }
    },
  
    onLoad: function (options) {
      this.checkLoginStatus();
    },
  
    onShow: function () {
      this.checkLoginStatus();
    },
  
    // 检查登录状态
    checkLoginStatus: function() {
      const userInfo = wx.getStorageSync('userInfo') || {};
      const isLoggedIn = !!(userInfo && userInfo.nickname && userInfo.nickname !== '请登录');
      
      this.setData({
        isLoggedIn: isLoggedIn
      });
      
      if (isLoggedIn) {
        this.loadUserData();
      }
    },
  
    loadUserData: function() {
      if (!this.data.isLoggedIn) {
        return;
      }
      
      try {
        console.log('=== 开始加载用户数据 ===');
        
        // 1. 加载当前登录用户的基本信息
        const currentUser = wx.getStorageSync('userInfo') || {};
        console.log('当前登录用户:', currentUser);
        
        // 2. 加载所有项目数据（不按用户ID过滤）
        const allProjects = wx.getStorageSync('projects') || [];
        console.log('所有项目数据（不按用户过滤）:', allProjects.length, '个');
        
        // 3. 加载当前用户的打卡记录（按用户过滤）
        const allCheckinRecords = wx.getStorageSync('checkin_records') || [];
        const userCheckinRecords = allCheckinRecords.filter(record => {
          // 兼容旧数据：如果记录没有userId，也显示
          return !record.userId || record.userId === currentUser.id;
        });
        console.log('用户打卡记录:', userCheckinRecords.length, '条');
        
        console.log('数据统计:', {
          userData: currentUser,
          projectsCount: allProjects.length, // 使用所有项目数
          checkinRecordsCount: userCheckinRecords.length
        });
        
        // 4. 计算统计数据
        console.log('=== 开始计算统计数据 ===');
        const continuousDays = this.calculateContinuousDays(userCheckinRecords);
        console.log('连续打卡天数:', continuousDays);
        
        // 使用所有项目计算完成率
        const completionRate = this.calculateCompletionRate(allProjects, userCheckinRecords);
        console.log('完成率:', completionRate);
        
        const checkinDays = this.calculateCheckinDays(userCheckinRecords);
        console.log('总打卡天数:', checkinDays);
        
        // 使用所有项目计算徽章
        const unlockedBadges = this.calculateUnlockedBadges(allProjects, userCheckinRecords);
        console.log('解锁徽章数量:', unlockedBadges);
        
        // 构建用户信息
        const userInfo = {
          nickname: currentUser.nickname || '用户',
          avatar: currentUser.avatar || '/images/default-avatar.png',
          stats: {
            projects: allProjects.length, // 显示所有项目数
            completionRate: completionRate,
            badges: unlockedBadges,
            checkinDays: checkinDays
          }
        };
        
        console.log('计算后的用户信息:', userInfo);
        
        // 更新数据
        this.setData({
          userInfo: userInfo,
          continuousDays: continuousDays
        });
        
        console.log('=== 用户数据加载完成 ===');
        
      } catch (error) {
        console.error('加载用户数据失败:', error);
      }
    },
  
    // 安全的日期解析函数
    parseRecordDate: function(record) {
      try {
        let dateStr = '';
        
        // 优先使用 localDate 字段
        if (record.localDate && typeof record.localDate === 'string') {
          const match = record.localDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
          if (match) {
            dateStr = `${match[1]}-${match[2]}-${match[3]}`;
            return dateStr;
          }
        }
        
        // 如果没有 localDate，尝试从 date 字段解析
        if (record.date) {
          // 如果是 ISO 格式字符串
          if (typeof record.date === 'string') {
            const dateObj = new Date(record.date);
            if (!isNaN(dateObj.getTime())) {
              const year = dateObj.getFullYear();
              const month = dateObj.getMonth() + 1;
              const day = dateObj.getDate();
              dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
              return dateStr;
            }
          }
          // 如果是时间戳
          else if (typeof record.date === 'number') {
            const dateObj = new Date(record.date);
            const year = dateObj.getFullYear();
            const month = dateObj.getMonth() + 1;
            const day = dateObj.getDate();
            dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            return dateStr;
          }
        }
        
        // 如果没有 date，使用 timestamp
        if (record.timestamp) {
          const dateObj = new Date(record.timestamp);
          const year = dateObj.getFullYear();
          const month = dateObj.getMonth() + 1;
          const day = dateObj.getDate();
          dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
          return dateStr;
        }
        
        // 如果都没有，返回 null
        return null;
      } catch (error) {
        console.error('解析记录日期失败:', error, record);
        return null;
      }
    },
  
    // 计算连续打卡天数
    calculateContinuousDays: function(checkinRecords) {
      if (!checkinRecords || checkinRecords.length === 0) {
        return 0;
      }
      
      try {
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
        
        // 提取所有有效日期并去重
        const dateSet = new Set();
        checkinRecords.forEach(record => {
          const dateStr = this.parseRecordDate(record);
          if (dateStr) {
            dateSet.add(dateStr);
          }
        });
        
        console.log('提取到的有效打卡日期:', Array.from(dateSet));
        
        // 如果没有有效日期
        if (dateSet.size === 0) {
          return 0;
        }
        
        // 按日期排序（从新到旧）
        const sortedDates = Array.from(dateSet).sort().reverse();
        
        console.log('排序后的日期:', sortedDates);
        
        // 检查今天是否打卡
        let streak = 0;
        let checkDate = new Date();
        
        for (let i = 0; i < 365; i++) { // 最多检查一年
          const expectedDate = `${checkDate.getFullYear()}-${(checkDate.getMonth() + 1).toString().padStart(2, '0')}-${checkDate.getDate().toString().padStart(2, '0')}`;
          
          console.log(`检查日期: ${expectedDate}, 今天: ${todayStr}`);
          
          if (sortedDates.includes(expectedDate)) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }
        
        console.log('计算出的连续天数:', streak);
        return streak;
        
      } catch (error) {
        console.error('计算连续天数失败:', error);
        return 0;
      }
    },
  
    // 计算项目的预期打卡天数（修复版）
    calculateExpectedCheckins: function(project) {
      try {
        console.log('计算项目预期打卡天数 - 项目信息:', {
          name: project.name,
          id: project.id,
          createdAt: project.createdAt,
          createdTime: project.createdTime,
          startDate: project.startDate
        });
        
        if (!project) {
          console.log('项目对象为空');
          return 0;
        }
        
        const now = new Date();
        let createdDate;
        
        // 尝试多种可能的创建时间字段
        if (project.createdAt) {
          createdDate = new Date(project.createdAt);
        } else if (project.createdTime) {
          createdDate = new Date(project.createdTime);
        } else if (project.startDate) {
          createdDate = new Date(project.startDate);
        } else if (project.createTime) {
          createdDate = new Date(project.createTime);
        } else {
          // 如果没有创建时间，假设是今天创建的
          console.log('项目没有创建时间，使用当前时间');
          createdDate = new Date();
        }
        
        console.log('创建日期对象:', createdDate);
        
        // 确保日期有效
        if (isNaN(createdDate.getTime())) {
          console.log('创建日期无效，使用当前时间');
          createdDate = new Date();
        }
        
        // 计算项目创建到现在有多少天
        const timeDiff = now.getTime() - createdDate.getTime();
        const daysDiff = Math.max(1, Math.ceil(timeDiff / (1000 * 3600 * 24)));
        
        console.log(`时间差: ${timeDiff}ms, 天数差: ${daysDiff}天`);
        
        // 最少为1天，最多为365天（一年的跟踪期）
        const expectedDays = Math.min(Math.max(1, daysDiff), 365);
        
        console.log(`项目 "${project.name}" 预期打卡天数: ${expectedDays}天`);
        return expectedDays;
        
      } catch (error) {
        console.error('计算预期打卡天数失败:', error, project);
        return 1; // 返回1天作为默认值
      }
    },
  
    // 计算项目的实际打卡天数
    calculateProjectActualCheckins: function(projectId, checkinRecords) {
      try {
        const dateSet = new Set();
        let count = 0;
        
        checkinRecords.forEach(record => {
          if (String(record.projectId) === String(projectId)) {
            count++;
            const dateStr = this.parseRecordDate(record);
            if (dateStr) {
              dateSet.add(dateStr);
            }
          }
        });
        
        console.log(`项目 ${projectId} 打卡统计: 总记录 ${count} 条, 去重后 ${dateSet.size} 天`);
        return dateSet.size;
        
      } catch (error) {
        console.error('计算项目实际打卡失败:', error);
        return 0;
      }
    },
  
    // 计算总体完成率（简化版，避免除零错误）
    calculateCompletionRate: function(projects, checkinRecords) {
      console.log('=== 开始计算完成率 ===');
      console.log(`项目数量: ${projects.length}, 打卡记录数: ${checkinRecords.length}`);
      
      if (projects.length === 0) {
        console.log('没有项目，返回0%');
        return '0%';
      }
      
      try {
        let totalProjectRates = 0;
        let validProjectsCount = 0;
        
        projects.forEach((project, index) => {
          console.log(`\n处理第 ${index + 1} 个项目: ${project.name || '未命名'} (ID: ${project.id})`);
          
          const projectId = project.id;
          
          // 计算该项目的预期打卡天数
          const expectedDays = this.calculateExpectedCheckins(project);
          console.log(`预期打卡天数: ${expectedDays}`);
          
          if (expectedDays > 0) {
            // 计算该项目的实际打卡天数
            const actualDays = this.calculateProjectActualCheckins(projectId, checkinRecords);
            console.log(`实际打卡天数: ${actualDays}`);
            
            // 计算项目完成率（不超过100%）
            const projectRate = Math.min(100, Math.round((actualDays / expectedDays) * 100));
            
            console.log(`项目 "${project.name}" 完成率: ${actualDays}/${expectedDays} = ${projectRate}%`);
            
            totalProjectRates += projectRate;
            validProjectsCount++;
          } else {
            console.log('预期天数为0，跳过此项目');
          }
        });
        
        console.log(`\n完成率汇总:`);
        console.log(`- 总项目数: ${projects.length}`);
        console.log(`- 有效项目数: ${validProjectsCount}`);
        console.log(`- 总完成率分数: ${totalProjectRates}`);
        
        // 如果有有效项目，计算平均完成率
        let avgRate;
        if (validProjectsCount > 0) {
          avgRate = Math.round(totalProjectRates / validProjectsCount);
        } else {
          avgRate = 0;
        }
        
        console.log(`- 平均完成率: ${avgRate}%`);
        
        // 备用方案：如果完成率为0，尝试计算今日完成率
        if (avgRate === 0 && projects.length > 0) {
          console.log('尝试计算今日完成率作为备用方案');
          const todayRate = this.calculateTodayCompletionRate(projects, checkinRecords);
          console.log(`今日完成率: ${todayRate}`);
          return todayRate;
        }
        
        return `${avgRate}%`;
        
      } catch (error) {
        console.error('计算完成率失败:', error);
        
        // 出现错误时返回今日完成率
        try {
          const todayRate = this.calculateTodayCompletionRate(projects, checkinRecords);
          console.log(`出错后使用今日完成率: ${todayRate}`);
          return todayRate;
        } catch (e) {
          console.error('计算今日完成率也失败:', e);
          return '0%';
        }
      }
    },
      
    // 计算今日完成率（备用方案）
    calculateTodayCompletionRate: function(projects, checkinRecords) {
      console.log('=== 计算今日完成率 ===');
      
      if (projects.length === 0) {
        return '0%';
      }
      
      try {
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
        console.log(`今天日期: ${todayStr}`);
        
        let completedToday = 0;
        
        projects.forEach(project => {
          const hasCheckedIn = checkinRecords.some(record => {
            if (String(record.projectId) !== String(project.id)) {
              return false;
            }
            
            const recordDateStr = this.parseRecordDate(record);
            if (!recordDateStr) {
              return false;
            }
            
            return recordDateStr === todayStr;
          });
          
          if (hasCheckedIn) {
            completedToday++;
          }
        });
        
        const rate = Math.round((completedToday / projects.length) * 100);
        console.log(`今日完成: ${completedToday}/${projects.length} = ${rate}%`);
        
        return `${rate}%`;
        
      } catch (error) {
        console.error('计算今日完成率失败:', error);
        return '0%';
      }
    },
  
    // 计算总打卡天数
    calculateCheckinDays: function(checkinRecords) {
      if (!checkinRecords || checkinRecords.length === 0) {
        return 0;
      }
      
      try {
        const dateSet = new Set();
        checkinRecords.forEach(record => {
          const dateStr = this.parseRecordDate(record);
          if (dateStr) {
            dateSet.add(dateStr);
          }
        });
        
        console.log('总打卡天数:', dateSet.size);
        return dateSet.size;
        
      } catch (error) {
        console.error('计算总打卡天数失败:', error);
        return 0;
      }
    },
  
    // 计算等级（根据积分）
    calculateLevel: function(totalPoints) {
      if (totalPoints < 10) return 1;
      if (totalPoints < 30) return 2;
      if (totalPoints < 60) return 3;
      if (totalPoints < 100) return 4;
      if (totalPoints < 150) return 5;
      if (totalPoints < 210) return 6;
      if (totalPoints < 280) return 7;
      if (totalPoints < 360) return 8;
      if (totalPoints < 450) return 9;
      return 10;
    },
  
    // 获取等级名称
    getLevelName: function(level) {
      const names = [
        '新手', '学徒', '入门', '熟练', '高手', 
        '精英', '大师', '宗师', '传奇', '神话'
      ];
      return names[level - 1] || '未知';
    },
  
    // 计算总积分
    calculateTotalPoints: function(projects, checkinRecords) {
      try {
        let totalPoints = 0;
        
        // 每个打卡记录加1分
        totalPoints += checkinRecords.length;
        console.log(`基础积分（打卡次数）: ${checkinRecords.length}`);
        
        // 连续打卡奖励
        const continuousDays = this.calculateContinuousDays(checkinRecords);
        console.log(`连续打卡天数: ${continuousDays}`);
        
        if (continuousDays >= 3) {
          totalPoints += 5;
          console.log('连续3天奖励: +5分');
        }
        if (continuousDays >= 7) {
          totalPoints += 10;
          console.log('连续7天奖励: +10分');
        }
        if (continuousDays >= 30) {
          totalPoints += 50;
          console.log('连续30天奖励: +50分');
        }
        
        // 项目完成奖励
        let projectRewards = 0;
        projects.forEach(project => {
          const checkins = checkinRecords.filter(record => 
            String(record.projectId) === String(project.id)
          ).length;
          
          const expectedDays = this.calculateExpectedCheckins(project);
          
          if (expectedDays > 0) {
            const completionRate = checkins / expectedDays;
            if (completionRate >= 0.5) {
              totalPoints += 10;
              projectRewards += 10;
            }
            if (completionRate >= 0.8) {
              totalPoints += 20;
              projectRewards += 20;
            }
            if (completionRate >= 1) {
              totalPoints += 50; // 完成项目
              projectRewards += 50;
            }
          }
        });
        
        console.log(`项目奖励积分: ${projectRewards}`);
        console.log(`总积分: ${totalPoints}`);
        
        return totalPoints;
      } catch (error) {
        console.error('计算总积分失败:', error);
        return 0;
      }
    },
  
    // 计算已解锁徽章数量
    calculateUnlockedBadges: function(projects, checkinRecords) {
      try {
        console.log('=== 开始计算徽章数量 ===');
        
        // 计算基础统计数据
        const totalCheckins = this.calculateCheckinDays(checkinRecords);
        const maxConsecutiveDays = this.calculateContinuousDays(checkinRecords);
        const totalPoints = this.calculateTotalPoints(projects, checkinRecords);
        const level = this.calculateLevel(totalPoints);
        
        console.log('基础统计数据:', {
          totalCheckins: totalCheckins,
          maxConsecutiveDays: maxConsecutiveDays,
          totalPoints: totalPoints,
          level: level
        });
        
        // 计算完成的项目数
        let completedProjects = 0;
        projects.forEach(project => {
          const checkins = checkinRecords.filter(record => 
            String(record.projectId) === String(project.id)
          ).length;
          const expectedDays = this.calculateExpectedCheckins(project);
          
          if (expectedDays > 0) {
            const completionRate = checkins / expectedDays;
            if (completionRate >= 0.8) { // 使用80%作为完成标准，避免要求100%完成
              completedProjects++;
            }
          }
        });
        
        console.log(`完成项目数（完成率≥80%）: ${completedProjects}`);
        
        let badgeCount = 0;
        const badgeDetails = [];
        
        // 1. 打卡相关徽章
        if (totalCheckins >= 1) {
          badgeCount++;
          badgeDetails.push('初出茅庐（累计1天）');
        }
        if (totalCheckins >= 7) {
          badgeCount++;
          badgeDetails.push('坚持之星（累计7天）');
        }
        if (totalCheckins >= 30) {
          badgeCount++;
          badgeDetails.push('月度达人（累计30天）');
        }
        if (totalCheckins >= 100) {
          badgeCount++;
          badgeDetails.push('百日坚持（累计100天）');
        }
        
        // 2. 连续打卡徽章
        if (maxConsecutiveDays >= 3) {
          badgeCount++;
          badgeDetails.push('三日连签（连续3天）');
        }
        if (maxConsecutiveDays >= 7) {
          badgeCount++;
          badgeDetails.push('周连签王（连续7天）');
        }
        if (maxConsecutiveDays >= 30) {
          badgeCount++;
          badgeDetails.push('月连签王（连续30天）');
        }
        
        // 3. 项目相关徽章
        if (projects.length >= 1) {
          badgeCount++;
          badgeDetails.push('项目创建者（创建1个项目）');
        }
        if (projects.length >= 3) {
          badgeCount++;
          badgeDetails.push('多面手（创建3个项目）');
        }
        if (completedProjects >= 1) {
          badgeCount++;
          badgeDetails.push('项目完成者（完成1个项目）');
        }
        if (completedProjects >= 3) {
          badgeCount++;
          badgeDetails.push('项目达人（完成3个项目）');
        }
        
        // 4. 等级徽章
        if (level >= 5) {
          badgeCount++;
          badgeDetails.push('等级达人（达到5级）');
        }
        
        // 5. 凌晨打卡徽章（特殊）
        const hasMidnightCheckin = this.checkMidnightCheckin(checkinRecords);
        if (hasMidnightCheckin) {
          badgeCount++;
          badgeDetails.push('深夜奋斗者（凌晨打卡）');
        }
        
        console.log('徽章详情:', badgeDetails);
        console.log('总徽章数量:', badgeCount);
        
        return badgeCount;
        
      } catch (error) {
        console.error('计算徽章数量失败:', error);
        return 0;
      }
    },
  
    // 检查是否有凌晨打卡记录
    checkMidnightCheckin: function(checkinRecords) {
      try {
        for (let i = 0; i < checkinRecords.length; i++) {
          const record = checkinRecords[i];
          if (record && record.localHour !== undefined) {
            // 检查是否是凌晨0-1点
            if (record.localHour === 0 || record.localHour === 1) {
              console.log('找到凌晨打卡记录:', record);
              return true;
            }
          }
        }
        console.log('没有找到凌晨打卡记录');
        return false;
      } catch (error) {
        console.error('检查凌晨打卡失败:', error);
        return false;
      }
    },
  
    // 显示登录选项
    showLoginOptions: function() {
      // 直接跳转到登录页面
      wx.navigateTo({
        url: '/pages/login/login?redirect=/pages/profile/profile'
      });
    },
  
    // 导航功能
    navigateTo: function(e) {
      const page = e.currentTarget.dataset.page;
      console.log('尝试跳转到页面:', page);
      
      // 根据页面类型处理
      switch(page) {
        case 'achievements':
          // 徽章成就页面
          wx.navigateTo({
            url: '/pages/badges/badges',
            fail: (err) => {
              console.error('跳转到徽章页面失败:', err);
              wx.showToast({
                title: '页面跳转失败',
                icon: 'none'
              });
            }
          });
          break;
          
        case 'statistics':
          // 数据分析页面
          wx.navigateTo({
            url: '/pages/analysis/analysis',
            fail: (err) => {
              console.error('跳转到数据分析页面失败:', err);
              wx.showToast({
                title: '页面跳转失败',
                icon: 'none'
              });
            }
          });
          break;
          
        case 'settings':
          // 应用设置 - 弹窗菜单
          this.showAppSettings();
          break;
          
        default:
          // 默认提示
          wx.showModal({
            title: '功能提示',
            content: '该功能开发中',
            showCancel: false
          });
      }
    },
      
    // 显示应用设置菜单（现在包含刷新数据）
    showAppSettings: function() {
      const actions = this.data.isLoggedIn 
        ? ['刷新数据', '主题设置', '通知设置', '隐私设置', '关于我们']
        : ['主题设置', '通知设置', '隐私设置', '关于我们'];
      
      wx.showActionSheet({
        itemList: actions,
        success: (res) => {
          if (this.data.isLoggedIn) {
            switch (res.tapIndex) {
              case 0:
                this.onRefresh();
                break;
              case 1:
                this.showThemeSettings();
                break;
              case 2:
                this.showNotificationSettings();
                break;
              case 3:
                this.showPrivacySettings();
                break;
              case 4:
                this.showAboutUs();
                break;
            }
          } else {
            switch (res.tapIndex) {
              case 0:
                this.showThemeSettings();
                break;
              case 1:
                this.showNotificationSettings();
                break;
              case 2:
                this.showPrivacySettings();
                break;
              case 3:
                this.showAboutUs();
                break;
            }
          }
        }
      });
    },
      
    // 主题设置
    showThemeSettings: function() {
      wx.showActionSheet({
        itemList: ['默认主题', '深色模式', '护眼模式', '自定义主题'],
        success: (res) => {
          const themes = ['默认主题', '深色模式', '护眼模式', '自定义主题'];
          const selectedTheme = themes[res.tapIndex];
          
          wx.setStorageSync('appTheme', selectedTheme);
          wx.showToast({
            title: `已切换为${selectedTheme}`,
            icon: 'success'
          });
        }
      });
    },
      
    // 通知设置
    showNotificationSettings: function() {
      const notificationSettings = wx.getStorageSync('notificationSettings') || {
        sound: true,
        vibration: true,
        popup: true
      };
      
      wx.showActionSheet({
        itemList: ['切换声音提示', '切换振动提示', '切换弹窗提示', '重置为默认'],
        success: (res) => {
          switch (res.tapIndex) {
            case 0:
              notificationSettings.sound = !notificationSettings.sound;
              break;
            case 1:
              notificationSettings.vibration = !notificationSettings.vibration;
              break;
            case 2:
              notificationSettings.popup = !notificationSettings.popup;
              break;
            case 3:
              notificationSettings.sound = true;
              notificationSettings.vibration = true;
              notificationSettings.popup = true;
              break;
          }
          
          wx.setStorageSync('notificationSettings', notificationSettings);
          
          wx.showToast({
            title: '通知设置已更新',
            icon: 'success'
          });
        }
      });
    },
      
    // 隐私设置
    showPrivacySettings: function() {
      wx.showModal({
        title: '隐私设置',
        content: '隐私设置选项：\n1. 数据同步\n2. 数据备份\n3. 数据清除\n\n当前版本为本地版本，所有数据存储在您的设备上。',
        showCancel: false,
        confirmText: '明白了'
      });
    },
      
    // 关于我们
    showAboutUs: function() {
      wx.showModal({
        title: '关于我们',
        content: '🎯 习惯养成打卡小程序\n\n版本：v1.0.0\n开发者：习惯养成团队\n联系方式：support@habit.com\n\n感谢使用本小程序！',
        showCancel: false,
        confirmText: '确定'
      });
    },
  
    // 修改资料 - 跳转到已有页面
    editProfile: function() {
      if (!this.data.isLoggedIn) {
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        });
        return;
      }
      
      // 跳转到已有的编辑资料页面
      wx.navigateTo({
        url: '/pages/edit-profile/edit-profile'
      });
    },
  
    // 显示数据管理菜单
    showDataManagement: function() {
      wx.showActionSheet({
        itemList: ['导入打卡数据', '导出打卡数据', '数据备份', '恢复备份', '清除缓存'],
        success: (res) => {
          switch (res.tapIndex) {
            case 0:
              this.importCheckinData();
              break;
            case 1:
              this.exportCheckinData();
              break;
            case 2:
              this.createBackup();
              break;
            case 3:
              this.restoreBackup();
              break;
            case 4:
              this.clearCache();
              break;
          }
        }
      });
    },
  
    // 以下是导入导出功能
    // 导出打卡数据
    exportCheckinData: function() {
      wx.showActionSheet({
        itemList: ['导出为JSON文件', '导出为CSV文件', '复制数据到剪贴板', '导出到相册'],
        success: (res) => {
          switch (res.tapIndex) {
            case 0:
              this.exportAsJSON();
              break;
            case 1:
              this.exportAsCSV();
              break;
            case 2:
              this.copyToClipboard();
              break;
            case 3:
              this.exportToAlbum();
              break;
          }
        }
      });
    },
  
    // 导出为JSON文件（仅导出当前用户数据）
    exportAsJSON: function() {
      try {
        const currentUser = wx.getStorageSync('userInfo') || {};
        
        // 获取所有项目（不按用户过滤）
        const allProjects = wx.getStorageSync('projects') || [];
        
        // 获取当前用户的打卡记录
        const allCheckinRecords = wx.getStorageSync('checkin_records') || [];
        const userCheckinRecords = allCheckinRecords.filter(record => 
          !record.userId || record.userId === currentUser.id
        );
        
        const exportData = {
          meta: {
            version: '1.0',
            exportDate: new Date().toISOString(),
            dataType: 'user_checkin_records',
            userId: currentUser.id,
            userName: currentUser.nickname,
            totalRecords: userCheckinRecords.length,
            totalProjects: allProjects.length
          },
          data: {
            projects: allProjects, // 导出所有项目
            checkinRecords: userCheckinRecords
          }
        };
        
        const jsonStr = JSON.stringify(exportData, null, 2);
        
        // 复制到剪贴板
        wx.setClipboardData({
          data: jsonStr,
          success: () => {
            wx.showModal({
              title: '导出成功',
              content: 'JSON数据已复制到剪贴板\n\n请在文本编辑器中粘贴保存',
              showCancel: false
            });
          }
        });
        
      } catch (error) {
        console.error('导出JSON失败:', error);
        wx.showToast({
          title: '导出失败',
          icon: 'error'
        });
      }
    },
  
    // 导出为CSV文件（仅导出当前用户数据）
    exportAsCSV: function() {
      try {
        const currentUser = wx.getStorageSync('userInfo') || {};
        
        // 获取当前用户的打卡记录
        const allCheckinRecords = wx.getStorageSync('checkin_records') || [];
        const userCheckinRecords = allCheckinRecords.filter(record => 
          !record.userId || record.userId === currentUser.id
        );
        
        if (userCheckinRecords.length === 0) {
          wx.showToast({
            title: '暂无打卡数据',
            icon: 'none'
          });
          return;
        }
        
        // 创建CSV头部
        let csvContent = '序号,项目ID,项目名称,打卡日期,打卡时间,备注\n';
        
        // 添加数据行
        userCheckinRecords.forEach((record, index) => {
          const row = [
            index + 1,
            record.projectId || '',
            record.projectName || '',
            record.date || '',
            record.time || '',
            record.notes || ''
          ].map(item => `"${item}"`).join(',');
          
          csvContent += row + '\n';
        });
        
        // 复制到剪贴板
        wx.setClipboardData({
          data: csvContent,
          success: () => {
            wx.showModal({
              title: '导出成功',
              content: 'CSV数据已复制到剪贴板\n\n请在文本编辑器中粘贴保存',
              showCancel: false
            });
          }
        });
        
      } catch (error) {
        console.error('导出CSV失败:', error);
        wx.showToast({
          title: '导出失败',
          icon: 'error'
        });
      }
    },
  
    // 导出到相册（仅导出当前用户数据）
    exportToAlbum: function() {
      try {
        const currentUser = wx.getStorageSync('userInfo') || {};
        
        // 获取所有项目（不按用户过滤）
        const allProjects = wx.getStorageSync('projects') || [];
        
        // 获取当前用户的打卡记录
        const allCheckinRecords = wx.getStorageSync('checkin_records') || [];
        const userCheckinRecords = allCheckinRecords.filter(record => 
          !record.userId || record.userId === currentUser.id
        );
        
        if (userCheckinRecords.length === 0) {
          wx.showToast({
            title: '暂无打卡数据',
            icon: 'none'
          });
          return;
        }
        
        // 创建要分享的文本
        let shareText = `🎯 用户打卡数据导出报告\n`;
        shareText += `👤 用户：${currentUser.nickname || '未命名'}\n`;
        shareText += `📅 导出时间：${new Date().toLocaleString()}\n`;
        shareText += `📊 项目总数：${allProjects.length}\n`;
        shareText += `✅ 打卡记录：${userCheckinRecords.length}条\n\n`;
        shareText += '📋 最近10条打卡记录：\n';
        
        // 显示最近10条记录
        const recentRecords = userCheckinRecords.slice(-10);
        recentRecords.forEach((record, index) => {
          shareText += `${index + 1}. ${record.projectName || '未知项目'}\n`;
          shareText += `   日期：${record.date} ${record.time || ''}\n`;
          if (record.notes) {
            shareText += `   备注：${record.notes}\n`;
          }
          shareText += '\n';
        });
        
        // 添加到剪贴板
        wx.setClipboardData({
          data: shareText,
          success: () => {
            wx.showModal({
              title: '数据已复制',
              content: '打卡数据已复制到剪贴板\n\n您可以粘贴到其他应用中保存或分享',
              showCancel: false,
              confirmText: '明白了'
            });
          }
        });
        
      } catch (error) {
        console.error('导出到相册失败:', error);
        wx.showToast({
          title: '导出失败',
          icon: 'error'
        });
      }
    },
  
    // 复制到剪贴板（仅导出当前用户数据）
    copyToClipboard: function() {
      try {
        const currentUser = wx.getStorageSync('userInfo') || {};
        
        // 获取当前用户的打卡记录
        const allCheckinRecords = wx.getStorageSync('checkin_records') || [];
        const userCheckinRecords = allCheckinRecords.filter(record => 
          !record.userId || record.userId === currentUser.id
        );
        
        if (userCheckinRecords.length === 0) {
          wx.showToast({
            title: '暂无打卡数据',
            icon: 'none'
          });
          return;
        }
        
        const exportData = {
          meta: {
            version: '1.0',
            exportDate: new Date().toISOString(),
            userId: currentUser.id,
            userName: currentUser.nickname,
            totalRecords: userCheckinRecords.length
          },
          data: userCheckinRecords
        };
        
        const jsonStr = JSON.stringify(exportData, null, 2);
        
        wx.setClipboardData({
          data: jsonStr,
          success: () => {
            wx.showToast({
              title: '已复制到剪贴板',
              icon: 'success',
              duration: 2000
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
      wx.showModal({
        title: '导入提示',
        content: '请输入要导入的JSON格式打卡数据',
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
  
    // 验证导入数据
    verifyImportData: function(importData) {
      let checkinRecords = [];
      let projects = [];
      
      // 提取数据
      if (importData.data) {
        checkinRecords = importData.data.checkinRecords || [];
        projects = importData.data.projects || [];
      } else if (Array.isArray(importData)) {
        checkinRecords = importData;
      } else if (importData.checkinRecords) {
        checkinRecords = importData.checkinRecords;
      }
      
      // 数据验证
      const validRecords = checkinRecords.filter(record => {
        return record && 
               record.projectId && 
               record.date;
      });
      
      // 显示确认对话框
      wx.showModal({
        title: '导入确认',
        content: `发现 ${validRecords.length} 条打卡记录${projects.length > 0 ? ` 和 ${projects.length} 个项目` : ''}\n\n导入方式：\n1. 追加导入（保留现有数据）\n2. 覆盖导入（清空现有数据）`,
        confirmText: '追加导入',
        cancelText: '覆盖导入',
        success: (res) => {
          if (res.confirm || res.cancel) {
            const mode = res.confirm ? 'append' : 'replace';
            this.executeImport(validRecords, projects, mode);
          }
        }
      });
    },
  
    // 执行导入（自动添加当前用户ID）
    executeImport: function(checkinRecords, projects, mode) {
      wx.showLoading({
        title: '正在导入...',
      });
      
      try {
        // 获取当前登录用户
        const currentUser = wx.getStorageSync('userInfo') || {};
        
        // 处理项目导入（如果需要）
        if (projects.length > 0) {
          const existingProjects = wx.getStorageSync('projects') || [];
          let newProjects;
          
          if (mode === 'replace') {
            // 替换模式下，为新项目添加当前用户ID
            newProjects = projects.map(project => {
              return {
                ...project,
                userId: currentUser.id || 'USER_422083',
                // 确保项目有创建时间
                createdAt: project.createdAt || new Date().toISOString(),
                createdTime: project.createdTime || Date.now()
              };
            });
          } else {
            // 追加模式，避免重复项目
            const existingIds = existingProjects.map(p => String(p.id));
            const uniqueProjects = projects.filter(p => !existingIds.includes(String(p.id)));
            const newUserProjects = uniqueProjects.map(project => {
              return {
                ...project,
                userId: currentUser.id || 'USER_422083',
                // 确保项目有创建时间
                createdAt: project.createdAt || new Date().toISOString(),
                createdTime: project.createdTime || Date.now()
              };
            });
            newProjects = [...existingProjects, ...newUserProjects];
          }
          
          wx.setStorageSync('projects', newProjects);
        }
        
        // 处理打卡记录导入
        const existingRecords = wx.getStorageSync('checkin_records') || [];
        let newRecords;
        
        if (mode === 'replace') {
          // 替换模式下，保留当前用户的数据
          const userExistingRecords = existingRecords.filter(record => 
            !record.userId || record.userId === currentUser.id
          );
          // 为新记录添加当前用户ID
          const newUserRecords = checkinRecords.map(record => {
            return {
              ...record,
              userId: currentUser.id || 'USER_422083',
              // 确保记录有时间戳
              timestamp: record.timestamp || Date.now(),
              localDate: record.localDate || record.date
            };
          });
          newRecords = [...userExistingRecords, ...newUserRecords];
        } else {
          // 追加模式，避免重复记录
          const existingKeys = new Set(
            existingRecords.map(r => `${r.projectId}_${r.date}_${r.time}`)
          );
          const uniqueRecords = checkinRecords.filter(r => {
            const key = `${r.projectId}_${r.date}_${r.time}`;
            return !existingKeys.has(key);
          });
          const newUserRecords = uniqueRecords.map(record => {
            return {
              ...record,
              userId: currentUser.id || 'USER_422083',
              // 确保记录有时间戳
              timestamp: record.timestamp || Date.now(),
              localDate: record.localDate || record.date
            };
          });
          newRecords = [...existingRecords, ...newUserRecords];
        }
        
        wx.setStorageSync('checkin_records', newRecords);
        
        wx.hideLoading();
        
        wx.showModal({
          title: '导入成功',
          content: `成功导入 ${checkinRecords.length} 条打卡记录${projects.length > 0 ? ` 和 ${projects.length} 个项目` : ''}`,
          showCancel: false,
          success: () => {
            // 自动刷新数据
            this.autoRefreshAfterImport();
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
  
    // 新增：导入后自动刷新
    autoRefreshAfterImport: function() {
      wx.showLoading({
        title: '正在刷新数据...',
      });
      
      // 延迟确保数据已保存
      setTimeout(() => {
        // 重新加载用户数据
        this.loadUserData();
        
        // 显示刷新成功提示
        setTimeout(() => {
          wx.hideLoading();
          wx.showToast({
            title: '数据已刷新',
            icon: 'success',
            duration: 1500
          });
          
          // 刷新页面显示
          this.setData({
            showRefreshAnimation: true
          });
          
          // 动画效果
          setTimeout(() => {
            this.setData({
              showRefreshAnimation: false
            });
          }, 1000);
          
        }, 1000);
        
      }, 500);
    },
  
    // 数据备份与恢复
    createBackup: function() {
      try {
        const currentUser = wx.getStorageSync('userInfo') || {};
        
        // 获取所有项目（不按用户过滤）
        const allProjects = wx.getStorageSync('projects') || [];
        
        // 获取当前用户的打卡记录
        const allCheckinRecords = wx.getStorageSync('checkin_records') || [];
        const userCheckinRecords = allCheckinRecords.filter(record => 
          !record.userId || record.userId === currentUser.id
        );
        
        const backupData = {
          meta: {
            version: '1.0',
            backupDate: new Date().toISOString(),
            device: wx.getSystemInfoSync().model,
            appVersion: '1.0.0',
            userId: currentUser.id || 'USER_422083',
            userName: currentUser.nickname
          },
          data: {
            projects: allProjects, // 备份所有项目
            checkinRecords: userCheckinRecords,
            userInfo: currentUser
          }
        };
        
        const jsonStr = JSON.stringify(backupData, null, 2);
        const fileName = `habit_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        
        // 复制到剪贴板
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
              title: '备份成功',
              content: `备份数据已复制到剪贴板\n\n备份时间：${new Date().toLocaleString()}\n用户：${currentUser.nickname}\n包含：${backupData.data.projects.length}个项目，${backupData.data.checkinRecords.length}条记录\n\n请粘贴到文本编辑器中保存备份文件`,
              showCancel: false
            });
          }
        });
        
      } catch (error) {
        console.error('创建备份失败:', error);
        wx.showToast({
          title: '备份失败',
          icon: 'error'
        });
      }
    },
  
    // 从备份恢复
    restoreBackup: function() {
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
            content: `确定要恢复备份吗？\n备份时间：${new Date(backup.date).toLocaleString()}\n用户：${backup.data.meta.userName}\n包含：${backup.data.data.projects.length}个项目，${backup.data.data.checkinRecords.length}条记录\n⚠️ 注意：这将覆盖现有数据！`,
            success: (res) => {
              if (res.confirm) {
                this.restoreBackupData(backup.data);
              }
            }
          });
        }
      });
    },
  
    // 恢复备份数据
    restoreBackupData: function(backupData) {
      wx.showLoading({
        title: '正在恢复...',
      });
      
      try {
        // 恢复当前用户的用户信息
        const currentUser = wx.getStorageSync('userInfo') || {};
        wx.setStorageSync('userInfo', {
          ...currentUser,
          ...backupData.data.userInfo
        });
        
        // 恢复项目数据（全部替换）
        const backupProjects = (backupData.data.projects || []).map(project => ({
          ...project,
          // 保持原有的userId
        }));
        wx.setStorageSync('projects', backupProjects);
        
        // 恢复打卡记录（只恢复当前用户的）
        const currentUserId = currentUser.id || backupData.meta.userId;
        const backupCheckins = (backupData.data.checkinRecords || []).map(record => ({
          ...record,
          userId: currentUserId
        }));
        wx.setStorageSync('checkin_records', backupCheckins);
        
        wx.hideLoading();
        
        wx.showModal({
          title: '恢复成功',
          content: `已成功恢复备份！\n恢复了 ${backupProjects.length} 个项目，${backupCheckins.length} 条打卡记录`,
          showCancel: false,
          success: () => {
            // 自动刷新数据
            this.autoRefreshAfterImport();
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
  
    // 清除缓存（只清除当前用户数据）
    clearCache: function() {
      wx.showModal({
        title: '清除缓存',
        content: '确定要清除所有本地缓存吗？\n\n⚠️ 注意：这将删除您的所有本地数据，包括项目、打卡记录等。建议先备份！',
        confirmColor: '#ff6b6b',
        success: (res) => {
          if (res.confirm) {
            wx.showLoading({
              title: '正在清除...',
            });
            
            setTimeout(() => {
              try {
                const currentUser = wx.getStorageSync('userInfo') || {};
                
                // 清除所有数据（不保留）
                wx.removeStorageSync('projects');
                wx.removeStorageSync('checkin_records');
                wx.removeStorageSync('backup_history');
                
                // 重新加载数据
                this.loadUserData();
                
                wx.hideLoading();
                
                wx.showModal({
                  title: '清除完成',
                  content: '所有本地缓存数据已清除',
                  showCancel: false
                });
              } catch (error) {
                wx.hideLoading();
                wx.showToast({
                  title: '清除失败',
                  icon: 'error'
                });
              }
            }, 1000);
          }
        }
      });
    },
  
    // 反馈页面 - 修改为弹窗提示
    goToFeedback: function() {
      wx.showModal({
        title: '问题反馈',
        content: '反馈功能开发中\n\n您可以通过以下方式提供反馈：\n1. 通过设置页面导出数据\n2. 如需帮助，请联系：support@habit.com',
        showCancel: false,
        confirmText: '知道了'
      });
    },
  
    // 帮助页面 - 修改为弹窗提示
    goToHelp: function() {
      wx.showModal({
        title: '使用帮助',
        content: '🎯 习惯养成打卡小程序使用指南\n\n1. 创建项目：点击右下角"+"按钮创建新项目\n2. 打卡记录：在项目详情页点击"打卡"按钮\n3. 数据查看：在个人页面查看统计数据和徽章\n4. 数据管理：在设置中可以导入导出数据\n\n坚持打卡，养成良好习惯！',
        showCancel: false,
        confirmText: '开始使用'
      });
    },
  
    // 退出登录
    logout: function() {
      wx.showModal({
        title: '退出登录',
        content: '确定要退出登录吗？\n\n退出后，您的数据将保留在本地，但需要重新登录才能查看。',
        confirmColor: '#ff6b6b',
        success: (res) => {
          if (res.confirm) {
            // 清除用户登录信息
            wx.setStorageSync('userInfo', {
              nickname: '请登录',
              avatar: '/images/default-avatar.png'
            });
            
            this.setData({
              isLoggedIn: false,
              userInfo: {
                nickname: '请登录',
                avatar: '/images/default-avatar.png',
                stats: {
                  projects: 0,
                  completionRate: '0%',
                  badges: 0,
                  checkinDays: 0
                }
              },
              continuousDays: 0
            });
            
            wx.showToast({
              title: '已退出登录',
              icon: 'success'
            });
          }
        }
      });
    },
  
    onTabChange: function(e) {
      const index = e.detail.index;
      const pages = ['/pages/panel/panel', '/pages/operation/operation', '/pages/profile/profile'];
      wx.switchTab({
        url: pages[index]
      });
    },
      
    // 刷新数据
    onRefresh: function() {
      this.loadUserData();
      wx.showToast({
        title: '数据已刷新',
        icon: 'success'
      });
    },
      
    // 分享个人资料
    onShareProfile: function() {
      if (!this.data.isLoggedIn) {
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        });
        return;
      }
      
      const userInfo = this.data.userInfo;
      const shareText = `📊 我的打卡数据\n\n👤 ${userInfo.nickname}\n📅 连续打卡：${this.data.continuousDays}天\n📋 项目数：${userInfo.stats.projects}\n✅ 完成率：${userInfo.stats.completionRate}\n🏆 徽章：${userInfo.stats.badges}个\n📈 总打卡：${userInfo.stats.checkinDays}天`;
      
      wx.showModal({
        title: '分享个人数据',
        content: shareText,
        confirmText: '复制分享',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            wx.setClipboardData({
              data: shareText,
              success: () => {
                wx.showToast({
                  title: '已复制到剪贴板',
                  icon: 'success'
                });
              }
            });
          }
        }
      });
    },
      
    // 查看调试信息
    onViewDebugInfo: function() {
      const currentUser = wx.getStorageSync('userInfo') || {};
      
      // 获取所有项目
      const allProjects = wx.getStorageSync('projects') || [];
      
      const allCheckinRecords = wx.getStorageSync('checkin_records') || [];
      const userCheckinRecords = allCheckinRecords.filter(record => 
        !record.userId || record.userId === currentUser.id
      );
      
      let debugInfo = `=== 调试信息 ===\n\n`;
      debugInfo += `👤 当前用户: ${currentUser.nickname || '未登录'}\n`;
      debugInfo += `📋 项目数量: ${allProjects.length}\n`;
      debugInfo += `📝 打卡记录: ${userCheckinRecords.length}\n\n`;
      
      if (allProjects.length > 0) {
        debugInfo += `📊 项目详情:\n`;
        allProjects.forEach((project, index) => {
          debugInfo += `${index + 1}. ${project.name || '未命名'} (ID: ${project.id})\n`;
          debugInfo += `   创建时间: ${project.createdAt || project.createdTime || '无'}\n`;
          debugInfo += `   用户ID: ${project.userId || '无'}\n`;
          
          const projectCheckins = userCheckinRecords.filter(r => String(r.projectId) === String(project.id));
          debugInfo += `   打卡次数: ${projectCheckins.length}\n`;
          
          const expectedDays = this.calculateExpectedCheckins(project);
          debugInfo += `   预期天数: ${expectedDays}\n\n`;
        });
      }
      
      wx.showModal({
        title: '调试信息',
        content: debugInfo,
        showCancel: false,
        confirmText: '知道了'
      });
    }
  });