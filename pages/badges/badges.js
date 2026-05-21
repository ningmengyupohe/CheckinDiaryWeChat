const storage = require('../../utils/storage.js');

Page({
  data: {
    loading: true,
    activeTab: 0,
    tabs: ['徽章', '成就'],
    
    // 徽章数据
    badges: [],
    filteredBadges: [],
    badgesUnlockedCount: 0,
    badgesTotalCount: 0,
    
    // 成就数据
    achievements: [],
    filteredAchievements: [],
    achievementsUnlockedCount: 0,
    achievementsTotalCount: 0,
    
    // 分类数据
    badgeCategories: [
      { id: 'all', name: '全部徽章' },
      { id: 'unlocked', name: '已获得' },
      { id: 'locked', name: '未获得' }
    ],
    achievementCategories: [
      { id: 'all', name: '全部成就' },
      { id: 'unlocked', name: '已完成' },
      { id: 'locked', name: '未完成' }
    ],
    
    selectedBadgeCategory: 'all',
    selectedAchievementCategory: 'all',
    
    // 统计数据
    stats: {
      totalCheckins: 0,
      maxConsecutiveDays: 0,
      completedProjects: 0,
      projectsCount: 0,
      totalPoints: 0,
      level: 1,
      levelName: '新手'
    }
  },

  onLoad: function (options) {
    console.log('徽章成就页面加载');
    this.loadData();
  },

  onShow: function () {
    console.log('徽章成就页面显示');
    this.loadData();
  },

  // 加载所有数据
  loadData: function () {
    console.log('开始加载数据...');
    this.setData({ loading: true });
    
    try {
      // 获取所有项目
      var projects = storage.getProjects();
      console.log('获取到的项目数:', projects.length);
      
      // 计算用户统计数据
      var userStats = this.calculateStatsDirectly(projects);
      console.log('用户统计数据:', userStats);
      
      // 获取徽章数据
      var badgesData = this.generateBadgesData(userStats);
      console.log('生成的徽章数据:', badgesData.length);
      
      // 获取成就数据
      var achievementsData = this.generateAchievementsData(userStats);
      console.log('生成的成就数据:', achievementsData.length);
      
      // 计算解锁数量
      var badgesUnlocked = 0;
      for (var i = 0; i < badgesData.length; i++) {
        if (badgesData[i].unlocked) {
          badgesUnlocked++;
        }
      }
      
      var achievementsUnlocked = 0;
      for (var j = 0; j < achievementsData.length; j++) {
        if (achievementsData[j].unlocked) {
          achievementsUnlocked++;
        }
      }
      
      // 初始筛选数据
      var filteredBadges = this.filterBadgesData(badgesData, 'all');
      var filteredAchievements = this.filterAchievementsData(achievementsData, 'all');
      
      this.setData({
        loading: false,
        badges: badgesData,
        filteredBadges: filteredBadges,
        badgesUnlockedCount: badgesUnlocked,
        badgesTotalCount: badgesData.length,
        achievements: achievementsData,
        filteredAchievements: filteredAchievements,
        achievementsUnlockedCount: achievementsUnlocked,
        achievementsTotalCount: achievementsData.length,
        stats: userStats
      });
      
      console.log('数据加载完成');
      console.log('徽章: ' + badgesUnlocked + '/' + badgesData.length);
      console.log('成就: ' + achievementsUnlocked + '/' + achievementsData.length);
      console.log('筛选后徽章数:', filteredBadges.length);
      console.log('筛选后成就数:', filteredAchievements.length);
    } catch (error) {
      console.error('加载数据失败:', error);
      var defaultBadges = this.getDefaultBadges();
      var defaultAchievements = this.getDefaultAchievements();
      
      this.setData({ 
        loading: false,
        badges: defaultBadges,
        filteredBadges: defaultBadges,
        badgesUnlockedCount: 0,
        badgesTotalCount: defaultBadges.length,
        achievements: defaultAchievements,
        filteredAchievements: defaultAchievements,
        achievementsUnlockedCount: 0,
        achievementsTotalCount: defaultAchievements.length,
        stats: this.getDefaultStats()
      });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  // 直接使用 storage 现有方法计算统计
  calculateStatsDirectly: function(projects) {
    console.log('开始计算统计数据...');
    
    var totalCheckins = 0;
    var maxConsecutiveDays = 0;
    var totalPoints = 0;
    var completedProjects = 0;
    var projectsCount = projects.length;
    
    // 遍历所有项目
    for (var i = 0; i < projects.length; i++) {
      var project = projects[i];
      console.log('处理项目: ' + project.name + ' (ID: ' + project.id + ')');
      
      // 使用现有的 getProjectStats 方法
      var stats = storage.getProjectStats(project.id);
      console.log('项目统计:', stats);
      
      // 累加总打卡天数（使用 storage 方法的结果）
      totalCheckins += stats.totalDays || 0;
      
      // 累加总积分
      totalPoints += stats.points || 0;
      
      // 记录最大连续天数
      if (stats.consecutiveDays > maxConsecutiveDays) {
        maxConsecutiveDays = stats.consecutiveDays;
      }
      
      // 计算完成的项目（完成度 >= 100%）
      if (stats.completionRate >= 100) {
        completedProjects++;
      }
    }
    
    console.log('计算后的统计:');
    console.log('- 总打卡天数:', totalCheckins);
    console.log('- 最大连续天数:', maxConsecutiveDays);
    console.log('- 总积分:', totalPoints);
    console.log('- 完成项目数:', completedProjects);
    console.log('- 总项目数:', projectsCount);
    
    // 计算等级
    var level = this.calculateLevel(totalPoints);
    
    return {
      totalCheckins: totalCheckins,
      maxConsecutiveDays: maxConsecutiveDays,
      totalPoints: totalPoints,
      completedProjects: completedProjects,
      projectsCount: projectsCount,
      level: level,
      levelName: this.getLevelName(level)
    };
  },

  // 计算等级
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
    var names = [
      '新手', '学徒', '入门', '熟练', '高手', 
      '精英', '大师', '宗师', '传奇', '神话'
    ];
    return names[level - 1] || '未知';
  },

  // 生成徽章数据
  generateBadgesData: function(userStats) {
    var badges = [];
    var today = new Date();
    var todayStr = today.getFullYear() + '-' + (today.getMonth() + 1).toString().padStart(2, '0') + '-' + today.getDate().toString().padStart(2, '0');
    
    // 1. 打卡相关徽章
    badges.push({
      id: 'checkin_first',
      name: '初出茅庐',
      description: '完成第一次打卡',
      icon: '🎉',
      color: '#FF6B6B',
      type: 'badge',
      unlocked: userStats.totalCheckins >= 1,
      progress: userStats.totalCheckins,
      target: 1,
      condition: '完成第一次打卡'
    });
    
    badges.push({
      id: 'checkin_7',
      name: '坚持之星',
      description: '累计打卡7天',
      icon: '🌟',
      color: '#000000',
      type: 'badge',
      unlocked: userStats.totalCheckins >= 7,
      progress: userStats.totalCheckins,
      target: 7,
      condition: '累计打卡7天'
    });
    
    badges.push({
      id: 'checkin_30',
      name: '月度达人',
      description: '累计打卡30天',
      icon: '🏆',
      color: '#6BCF7F',
      type: 'badge',
      unlocked: userStats.totalCheckins >= 30,
      progress: userStats.totalCheckins,
      target: 30,
      condition: '累计打卡30天'
    });
    
    badges.push({
      id: 'checkin_100',
      name: '百日坚持',
      description: '累计打卡100天',
      icon: '💯',
      color: '#9D65C9',
      type: 'badge',
      unlocked: userStats.totalCheckins >= 100,
      progress: userStats.totalCheckins,
      target: 100,
      condition: '累计打卡100天'
    });
    
    // 2. 连续打卡徽章
    badges.push({
      id: 'consecutive_3',
      name: '三日连签',
      description: '连续打卡3天',
      icon: '🔥',
      color: '#FF9F43',
      type: 'badge',
      unlocked: userStats.maxConsecutiveDays >= 3,
      progress: userStats.maxConsecutiveDays,
      target: 3,
      condition: '连续打卡3天'
    });
    
    badges.push({
      id: 'consecutive_7',
      name: '周连签王',
      description: '连续打卡7天',
      icon: '⭐',
      color: '#F368E0',
      type: 'badge',
      unlocked: userStats.maxConsecutiveDays >= 7,
      progress: userStats.maxConsecutiveDays,
      target: 7,
      condition: '连续打卡7天'
    });
    
    badges.push({
      id: 'consecutive_30',
      name: '月连签王',
      description: '连续打卡30天',
      icon: '🌙',
      color: '#48DBFB',
      type: 'badge',
      unlocked: userStats.maxConsecutiveDays >= 30,
      progress: userStats.maxConsecutiveDays,
      target: 30,
      condition: '连续打卡30天'
    });
    
    // 3. 项目相关徽章
    badges.push({
      id: 'project_first',
      name: '项目创建者',
      description: '创建第一个项目',
      icon: '🛠️',
      color: '#5F27CD',
      type: 'badge',
      unlocked: userStats.projectsCount >= 1,
      progress: userStats.projectsCount,
      target: 1,
      condition: '创建第一个项目'
    });
    
    badges.push({
      id: 'project_3',
      name: '多面手',
      description: '创建3个项目',
      icon: '🎯',
      color: '#00D2D3',
      type: 'badge',
      unlocked: userStats.projectsCount >= 3,
      progress: userStats.projectsCount,
      target: 3,
      condition: '创建3个项目'
    });
    
    badges.push({
      id: 'project_complete_1',
      name: '项目完成者',
      description: '完成第一个项目',
      icon: '✅',
      color: '#1DD1A1',
      type: 'badge',
      unlocked: userStats.completedProjects >= 1,
      progress: userStats.completedProjects,
      target: 1,
      condition: '完成第一个项目（达到100%）'
    });
    
    badges.push({
      id: 'project_complete_3',
      name: '项目达人',
      description: '完成3个项目',
      icon: '👑',
      color: '#FECA57',
      type: 'badge',
      unlocked: userStats.completedProjects >= 3,
      progress: userStats.completedProjects,
      target: 3,
      condition: '完成3个项目'
    });
    
    // 4. 特殊徽章
    var hasMidnightCheckin = this.checkMidnightCheckin();
    badges.push({
      id: 'midnight_checkin',
      name: '深夜奋斗者',
      description: '在凌晨打卡',
      icon: '🌙',
      color: '#341F97',
      type: 'badge',
      unlocked: hasMidnightCheckin,
      progress: hasMidnightCheckin ? 1 : 0,
      target: 1,
      condition: '在凌晨（0点-1点）打卡',
      isSecret: true
    });
    
    // 5. 等级徽章
    badges.push({
      id: 'level_achiever',
      name: '等级达人',
      description: '达到等级5',
      icon: '⭐',
      color: '#FF9A76',
      type: 'badge',
      unlocked: userStats.level >= 5,
      progress: userStats.level,
      target: 5,
      condition: '达到等级5'
    });
    
    // 添加解锁时间
    var badgesWithDate = [];
    for (var i = 0; i < badges.length; i++) {
      var badge = badges[i];
      if (badge.unlocked) {
        var newBadge = {};
        // 复制所有属性
        for (var key in badge) {
          if (badge.hasOwnProperty(key)) {
            newBadge[key] = badge[key];
          }
        }
        newBadge.date = todayStr;
        badgesWithDate.push(newBadge);
      } else {
        badgesWithDate.push(badge);
      }
    }
    
    return badgesWithDate;
  },

  // 检查是否有凌晨打卡记录
  checkMidnightCheckin: function() {
    try {
      // 直接访问 storage 中的打卡记录
      var checkinRecords = wx.getStorageSync('checkin_records') || [];
      
      for (var i = 0; i < checkinRecords.length; i++) {
        var record = checkinRecords[i];
        if (record && record.localHour !== undefined) {
          // 检查是否是凌晨0-1点
          if (record.localHour === 0 || record.localHour === 1) {
            return true;
          }
        }
      }
      return false;
    } catch (error) {
      console.error('检查凌晨打卡失败:', error);
      return false;
    }
  },

  // 生成成就数据
  generateAchievementsData: function(userStats) {
    var achievements = [];
    var today = new Date();
    var todayStr = today.getFullYear() + '-' + (today.getMonth() + 1).toString().padStart(2, '0') + '-' + today.getDate().toString().padStart(2, '0');
    
    // 1. 等级成就
    achievements.push({
      id: 'level_1',
      name: '新手起步',
      description: '达到等级1',
      icon: '🎮',
      color: '#C8D6E5',
      type: 'achievement',
      unlocked: userStats.level >= 1,
      progress: userStats.level,
      target: 1,
      condition: '达到等级1',
      reward: '获得新手称号'
    });
    
    achievements.push({
      id: 'level_3',
      name: '熟练工',
      description: '达到等级3',
      icon: '⚡',
      color: '#48DBFB',
      type: 'achievement',
      unlocked: userStats.level >= 3,
      progress: userStats.level,
      target: 3,
      condition: '达到等级3',
      reward: '获得熟练工称号'
    });
    
    achievements.push({
      id: 'level_5',
      name: '高手',
      description: '达到等级5',
      icon: '🏅',
      color: '#FF9FF3',
      type: 'achievement',
      unlocked: userStats.level >= 5,
      progress: userStats.level,
      target: 5,
      condition: '达到等级5',
      reward: '获得高手称号'
    });
    
    achievements.push({
      id: 'level_8',
      name: '宗师',
      description: '达到等级8',
      icon: '👑',
      color: '#FDCB6E',
      type: 'achievement',
      unlocked: userStats.level >= 8,
      progress: userStats.level,
      target: 8,
      condition: '达到等级8',
      reward: '获得宗师称号'
    });
    
    achievements.push({
      id: 'level_10',
      name: '神话',
      description: '达到最高等级10',
      icon: '✨',
      color: '#FFD700',
      type: 'achievement',
      unlocked: userStats.level >= 10,
      progress: userStats.level,
      target: 10,
      condition: '达到最高等级10',
      reward: '获得神话称号'
    });
    
    // 2. 积分成就
    achievements.push({
      id: 'points_100',
      name: '积分达人',
      description: '获得100积分',
      icon: '💰',
      color: '#FF6B6B',
      type: 'achievement',
      unlocked: userStats.totalPoints >= 100,
      progress: userStats.totalPoints,
      target: 100,
      condition: '累计获得100积分',
      reward: '解锁高级功能'
    });
    
    achievements.push({
      id: 'points_500',
      name: '积分大师',
      description: '获得500积分',
      icon: '💎',
      color: '#4ECDC4',
      type: 'achievement',
      unlocked: userStats.totalPoints >= 500,
      progress: userStats.totalPoints,
      target: 500,
      condition: '累计获得500积分',
      reward: '解锁专属主题'
    });
    
    achievements.push({
      id: 'points_1000',
      name: '积分王者',
      description: '获得1000积分',
      icon: '👑',
      color: '#45B7D1',
      type: 'achievement',
      unlocked: userStats.totalPoints >= 1000,
      progress: userStats.totalPoints,
      target: 1000,
      condition: '累计获得1000积分',
      reward: '解锁所有功能'
    });
    
    // 3. 打卡成就
    achievements.push({
      id: 'checkin_50',
      name: '打卡先锋',
      description: '累计打卡50天',
      icon: '📅',
      color: '#FFDE7D',
      type: 'achievement',
      unlocked: userStats.totalCheckins >= 50,
      progress: userStats.totalCheckins,
      target: 50,
      condition: '累计打卡50天',
      reward: '获得打卡先锋称号'
    });
    
    achievements.push({
      id: 'checkin_365',
      name: '年度打卡王',
      description: '累计打卡365天',
      icon: '👑',
      color: '#9D65C9',
      type: 'achievement',
      unlocked: userStats.totalCheckins >= 365,
      progress: userStats.totalCheckins,
      target: 365,
      condition: '累计打卡365天',
      reward: '获得年度打卡王称号'
    });
    
    // 4. 项目成就
    achievements.push({
      id: 'project_master',
      name: '项目管理师',
      description: '完成5个项目',
      icon: '📊',
      color: '#2EC4B6',
      type: 'achievement',
      unlocked: userStats.completedProjects >= 5,
      progress: userStats.completedProjects,
      target: 5,
      condition: '完成5个项目',
      reward: '获得项目管理师称号'
    });
    
    // 5. 特殊成就 - 需要计算基础徽章数量
    var badgesUnlockedCount = this.data.badgesUnlockedCount;
    achievements.push({
      id: 'completionist',
      name: '完美主义者',
      description: '完成所有基础徽章',
      icon: '🎖️',
      color: '#FF6B9D',
      type: 'achievement',
      unlocked: badgesUnlockedCount >= 10, // 假设基础徽章有10个
      progress: badgesUnlockedCount,
      target: 10,
      condition: '获得所有基础徽章',
      reward: '获得完美主义者称号',
      isSecret: true
    });
    
    // 添加解锁时间
    var achievementsWithDate = [];
    for (var i = 0; i < achievements.length; i++) {
      var achievement = achievements[i];
      if (achievement.unlocked) {
        var newAchievement = {};
        // 复制所有属性
        for (var key in achievement) {
          if (achievement.hasOwnProperty(key)) {
            newAchievement[key] = achievement[key];
          }
        }
        newAchievement.date = todayStr;
        achievementsWithDate.push(newAchievement);
      } else {
        achievementsWithDate.push(achievement);
      }
    }
    
    return achievementsWithDate;
  },

  // 筛选徽章数据
  filterBadgesData: function(badges, category) {
    if (!badges || badges.length === 0) {
      return [];
    }
    
    if (category === 'all') {
      return badges;
    } else if (category === 'unlocked') {
      var unlockedBadges = [];
      for (var i = 0; i < badges.length; i++) {
        if (badges[i].unlocked) {
          unlockedBadges.push(badges[i]);
        }
      }
      return unlockedBadges;
    } else {
      var lockedBadges = [];
      for (var j = 0; j < badges.length; j++) {
        if (!badges[j].unlocked) {
          lockedBadges.push(badges[j]);
        }
      }
      return lockedBadges;
    }
  },

  // 筛选成就数据
  filterAchievementsData: function(achievements, category) {
    if (!achievements || achievements.length === 0) {
      return [];
    }
    
    if (category === 'all') {
      return achievements;
    } else if (category === 'unlocked') {
      var unlockedAchievements = [];
      for (var i = 0; i < achievements.length; i++) {
        if (achievements[i].unlocked) {
          unlockedAchievements.push(achievements[i]);
        }
      }
      return unlockedAchievements;
    } else {
      var lockedAchievements = [];
      for (var j = 0; j < achievements.length; j++) {
        if (!achievements[j].unlocked) {
          lockedAchievements.push(achievements[j]);
        }
      }
      return lockedAchievements;
    }
  },

  // 默认徽章数据
  getDefaultBadges: function () {
    return [
      {
        id: 'checkin_first',
        name: '初出茅庐',
        description: '完成第一次打卡',
        icon: '🎉',
        color: '#FF6B6B',
        type: 'badge',
        unlocked: false,
        date: null,
        progress: 0,
        target: 1,
        condition: '完成第一次打卡'
      },
      {
        id: 'project_first',
        name: '项目创建者',
        description: '创建第一个项目',
        icon: '🛠️',
        color: '#5F27CD',
        type: 'badge',
        unlocked: false,
        date: null,
        progress: 0,
        target: 1,
        condition: '创建第一个项目'
      }
    ];
  },

  // 默认成就数据
  getDefaultAchievements: function () {
    return [
      {
        id: 'level_1',
        name: '新手起步',
        description: '达到等级1',
        icon: '🎮',
        color: '#C8D6E5',
        type: 'achievement',
        unlocked: false,
        date: null,
        progress: 0,
        target: 1,
        condition: '达到等级1',
        reward: '获得新手称号'
      }
    ];
  },

  // 默认统计数据
  getDefaultStats: function() {
    return {
      totalCheckins: 0,
      maxConsecutiveDays: 0,
      completedProjects: 0,
      projectsCount: 0,
      totalPoints: 0,
      level: 1,
      levelName: '新手'
    };
  },

  // 切换标签页
  switchTab: function (e) {
    var index = e.currentTarget.dataset.index;
    console.log('切换到标签页:', index);
    this.setData({
      activeTab: index
    });
  },

  // 切换徽章分类
  switchBadgeCategory: function (e) {
    var category = e.currentTarget.dataset.category;
    console.log('切换到徽章分类:', category);
    
    var filteredBadges = this.filterBadgesData(this.data.badges, category);
    
    this.setData({
      selectedBadgeCategory: category,
      filteredBadges: filteredBadges
    });
  },

  // 切换成就分类
  switchAchievementCategory: function (e) {
    var category = e.currentTarget.dataset.category;
    console.log('切换到成就分类:', category);
    
    var filteredAchievements = this.filterAchievementsData(this.data.achievements, category);
    
    this.setData({
      selectedAchievementCategory: category,
      filteredAchievements: filteredAchievements
    });
  },

  // 查看详情
  viewDetail: function (e) {
    var itemId = e.currentTarget.dataset.id;
    var itemType = e.currentTarget.dataset.type; // 'badge' or 'achievement'
    
    var item;
    if (itemType === 'badge') {
      var badges = this.data.badges;
      for (var i = 0; i < badges.length; i++) {
        if (badges[i].id === itemId) {
          item = badges[i];
          break;
        }
      }
    } else {
      var achievements = this.data.achievements;
      for (var j = 0; j < achievements.length; j++) {
        if (achievements[j].id === itemId) {
          item = achievements[j];
          break;
        }
      }
    }
    
    if (!item) {
      wx.showToast({
        title: '未找到项目信息',
        icon: 'none'
      });
      return;
    }
    
    var content = item.description;
    
    // 如果是秘密徽章且未解锁，不显示详细信息
    if (item.isSecret && !item.unlocked) {
      content = '这是一个隐藏奖励，需要满足特定条件才能解锁！';
    } else {
      content += '\n\n📌 获取条件：' + item.condition;
      
      if (item.type === 'achievement' && item.reward) {
        content += '\n🎁 完成奖励：' + item.reward;
      }
      
      if (item.unlocked) {
        content += '\n\n✅ 已' + (item.type === 'badge' ? '获得' : '完成');
        if (item.date) {
          content += '\n完成时间：' + item.date;
        }
      } else {
        content += '\n\n📊 进度：' + item.progress + '/' + item.target;
        var percent = Math.round((item.progress / item.target) * 100);
        content += ' (' + percent + '%)';
        
        if (item.target > 1) {
          var remaining = item.target - item.progress;
          content += '\n还需完成：' + remaining + '次';
        }
      }
    }
    
    var that = this;
    wx.showModal({
      title: item.name,
      content: content,
      showCancel: false,
      confirmText: item.unlocked ? '分享' : '知道了',
      success: function(res) {
        if (item.unlocked && res.confirm) {
          that.shareItem(item);
        }
      }
    });
  },

  // 分享项目
  shareItem: function (item) {
    if (!item || !item.unlocked) {
      wx.showToast({
        title: '请先完成该项目',
        icon: 'none'
      });
      return;
    }
    
    var typeText = item.type === 'badge' ? '徽章' : '成就';
    var text = '🎖️ 我在习惯养成小程序中获得了' + typeText + '：【' + item.name + '】\n' + item.description + '\n获取条件：' + item.condition + '\n你也来试试吧！';
    
    var that = this;
    wx.showActionSheet({
      itemList: ['分享给朋友', '保存图片', '复制信息'],
      success: function(res) {
        if (res.tapIndex === 0) {
          wx.setClipboardData({
            data: text,
            success: function() {
              wx.showToast({
                title: '已复制分享内容',
                icon: 'success'
              });
            }
          });
        } else if (res.tapIndex === 1) {
          wx.showToast({
            title: '保存图片功能开发中',
            icon: 'none'
          });
        } else if (res.tapIndex === 2) {
          that.copyItemInfo(item);
        }
      }
    });
  },

  // 复制项目信息
  copyItemInfo: function (item) {
    var typeText = item.type === 'badge' ? '徽章' : '成就';
    var text = '【' + item.name + '】\n' + item.description + '\n获取条件：' + item.condition;
    
    if (item.type === 'achievement' && item.reward) {
      text += '\n完成奖励：' + item.reward;
    }
    
    if (item.unlocked) {
      text += '\n完成时间：' + (item.date || '最近');
    } else {
      text += '\n进度：' + item.progress + '/' + item.target;
    }
    
    wx.setClipboardData({
      data: text,
      success: function() {
        wx.showToast({
          title: '已复制' + typeText + '信息',
          icon: 'success'
        });
      }
    });
  },

  // 刷新页面
  onRefresh: function () {
    this.loadData();
    wx.showToast({
      title: '已刷新',
      icon: 'success'
    });
  },

  // 下拉刷新
  onPullDownRefresh: function () {
    this.loadData();
    var that = this;
    setTimeout(function() {
      wx.stopPullDownRefresh();
      wx.showToast({
        title: '刷新完成',
        icon: 'success'
      });
    }, 1000);
  },

  // 分享到朋友圈
  onShareAppMessage: function () {
    return {
      title: '我的徽章与成就',
      path: '/pages/badges/badges'
    };
  }
});