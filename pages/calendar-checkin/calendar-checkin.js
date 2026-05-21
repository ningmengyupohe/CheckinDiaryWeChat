// pages/calendar-checkin/calendar-checkin.js
Page({
    data: {
      projects: [],
      selectedProjectIndex: -1,
      selectedProject: { name: '全部项目' },
      currentMonth: '',
      displayMonth: '',
      weekDays: ['日', '一', '二', '三', '四', '五', '六'],
      calendarDays: [],
      selectedDate: null,
      selectedDayCheckins: [],
      stats: {
        totalDays: 0,
        currentStreak: 0,
        maxStreak: 0,
        completionRate: 0
      }
    },
  
    onLoad: function () {
      console.log('日历页面加载');
      this.initDate();
      this.loadData();
    },
  
    onShow: function () {
      console.log('日历页面显示');
      this.loadData();
    },
  
    onPullDownRefresh: function () {
      console.log('下拉刷新');
      this.loadData();
      setTimeout(function() {
        wx.stopPullDownRefresh();
      }, 1000);
    },
  
    // 初始化日期
    initDate: function () {
      var now = new Date();
      var year = now.getFullYear();
      var month = now.getMonth() + 1;
      var monthStr = month < 10 ? '0' + month : month.toString();
      
      this.setData({
        currentMonth: year + '-' + monthStr,
        displayMonth: year + '年' + month + '月'
      });
    },
  
    // 加载数据
    loadData: function () {
      try {
        // 清理无效数据
        this.cleanInvalidData();
        
        // 加载项目
        var projects = this.loadProjects();
        
        // 加载打卡记录并格式化
        var rawCheckins = wx.getStorageSync('checkin_records') || [];
        var checkins = this.formatCheckinData(rawCheckins);
        
        // 生成日历
        var calendarDays = this.generateCalendar(this.data.currentMonth, checkins);
        
        // 计算统计
        var stats = this.calculateStats(checkins, projects);
        
        this.setData({
          projects: projects,
          calendarDays: calendarDays,
          stats: stats
        });
        
        console.log('数据加载完成');
      } catch (error) {
        console.error('加载数据失败:', error);
      }
    },
  
    // 清理无效数据
    cleanInvalidData: function() {
      try {
        var checkins = wx.getStorageSync('checkin_records') || [];
        var validCheckins = [];
        var seenIds = {};
        var seenKeys = {}; // 用于检查项目-日期组合是否重复
        
        for (var i = 0; i < checkins.length; i++) {
          var record = checkins[i];
          
          // 检查记录是否有效
          if (record && 
              typeof record === 'object' && 
              record.id && 
              record.projectId && 
              record.date) {
            
            // 检查是否有重复ID
            if (seenIds[record.id]) {
              console.log('发现重复ID记录，跳过:', record.id);
              continue;
            }
            seenIds[record.id] = true;
            
            // 格式化日期部分
            var dateKey = '';
            try {
              var dateObj = new Date(record.date);
              var year = dateObj.getFullYear();
              var month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
              var day = dateObj.getDate().toString().padStart(2, '0');
              dateKey = year + '-' + month + '-' + day;
              
              // 创建唯一键：项目ID + 日期
              var uniqueKey = record.projectId + '_' + dateKey;
              
              // 检查是否在同一天有相同项目的重复打卡
              if (seenKeys[uniqueKey]) {
                console.log('发现同项目同日期重复打卡，跳过:', uniqueKey);
                continue;
              }
              seenKeys[uniqueKey] = true;
              
            } catch (e) {
              console.error('日期解析失败，跳过记录:', record);
              continue;
            }
            
            // 确保有项目名称
            if (!record.projectName) {
              var projects = wx.getStorageSync('projects') || [];
              for (var j = 0; j < projects.length; j++) {
                if (projects[j].id === record.projectId) {
                  record.projectName = projects[j].name;
                  record.category = projects[j].category;
                  break;
                }
              }
            }
            
            // 确保有时问字段
            if (!record.time) {
              try {
                var dateObj = new Date(record.date);
                var hours = dateObj.getHours().toString().padStart(2, '0');
                var minutes = dateObj.getMinutes().toString().padStart(2, '0');
                record.time = hours + ':' + minutes;
              } catch (e) {
                record.time = '00:00';
              }
            }
            
            // 确保有notes字段
            if (!record.notes) {
              record.notes = '';
            }
            
            validCheckins.push(record);
          }
        }
        
        // 如果有变化，保存清理后的数据
        if (validCheckins.length !== checkins.length) {
          wx.setStorageSync('checkin_records', validCheckins);
          console.log('清理无效和重复数据完成，原记录数:', checkins.length, '有效记录数:', validCheckins.length);
          
          // 提示用户
          if (checkins.length - validCheckins.length > 0) {
            wx.showToast({
              title: '已清理' + (checkins.length - validCheckins.length) + '条重复记录',
              icon: 'success',
              duration: 2000
            });
          }
        }
        
      } catch (error) {
        console.error('清理数据失败:', error);
      }
    },
  
    // 格式化打卡数据
    formatCheckinData: function(rawCheckins) {
      var formattedCheckins = [];
      
      for (var i = 0; i < rawCheckins.length; i++) {
        var record = rawCheckins[i];
        
        if (record && record.date) {
          try {
            // 解析日期
            var dateObj = new Date(record.date);
            
            // 获取日期部分 (YYYY-MM-DD)
            var year = dateObj.getFullYear();
            var month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
            var day = dateObj.getDate().toString().padStart(2, '0');
            var dateStr = year + '-' + month + '-' + day;
            
            // 获取时间部分 (HH:MM)
            var hours = dateObj.getHours().toString().padStart(2, '0');
            var minutes = dateObj.getMinutes().toString().padStart(2, '0');
            var timeStr = hours + ':' + minutes;
            
            // 获取项目信息
            var projects = wx.getStorageSync('projects') || [];
            var projectName = '';
            var category = '';
            
            for (var j = 0; j < projects.length; j++) {
              if (projects[j].id === record.projectId) {
                projectName = projects[j].name;
                category = projects[j].category || 'default';
                break;
              }
            }
            
            var formattedRecord = {
              id: record.id || Date.now() + i,
              projectId: record.projectId,
              projectName: record.projectName || projectName,
              date: dateStr,  // 只保存日期部分
              time: record.time || timeStr,
              category: category,
              notes: record.notes || '',
              fullDate: record.date,  // 保留完整时间戳用于显示
              projectColor: this.getProjectColor(category)
            };
            
            formattedCheckins.push(formattedRecord);
            
          } catch (error) {
            console.error('格式化打卡记录失败:', record, error);
          }
        }
      }
      
      return formattedCheckins;
    },
  
    // 加载项目
    loadProjects: function() {
      try {
        var projects = wx.getStorageSync('projects') || [];
        var result = [];
        
        for (var i = 0; i < projects.length; i++) {
          var project = projects[i];
          result.push({
            id: project.id,
            name: project.name || '未命名项目',
            description: project.description || '',
            category: project.category || 'default',
            color: this.getProjectColor(project.category || 'default')
          });
        }
        
        return result;
      } catch (error) {
        console.error('加载项目失败:', error);
        return [];
      }
    },
  
    // 获取项目颜色
    getProjectColor: function(category) {
      if (category === 'health') return 'health-color';
      if (category === 'learning') return 'learning-color';
      if (category === 'work') return 'work-color';
      if (category === 'personal') return 'personal-color';
      if (category === 'life') return 'life-color';
      return 'default-color';
    },
  
    // 生成日历
    generateCalendar: function(month, checkins) {
      var parts = month.split('-');
      var year = parseInt(parts[0]);
      var monthNum = parseInt(parts[1]);
      
      var firstDay = new Date(year, monthNum - 1, 1);
      var lastDay = new Date(year, monthNum, 0);
      var daysInMonth = lastDay.getDate();
      var firstDayOfWeek = firstDay.getDay();
      
      var calendarDays = [];
      
      // 添加空白日期
      for (var i = 0; i < firstDayOfWeek; i++) {
        calendarDays.push({
          day: '',
          isCurrentMonth: false,
          hasCheckin: false,
          checkinCount: 0
        });
      }
      
      // 添加当前月日期
      for (var day = 1; day <= daysInMonth; day++) {
        var dayStr = day < 10 ? '0' + day : day.toString();
        var dateStr = year + '-' + (monthNum < 10 ? '0' + monthNum : monthNum) + '-' + dayStr;
        
        // 筛选该日期的打卡记录
        var dayCheckins = [];
        for (var j = 0; j < checkins.length; j++) {
          var checkin = checkins[j];
          if (checkin && checkin.date === dateStr) {
            dayCheckins.push(checkin);
          }
        }
        
        calendarDays.push({
          day: day,
          fullDate: dateStr,
          isCurrentMonth: true,
          isToday: this.isToday(dateStr),
          hasCheckin: dayCheckins.length > 0,
          checkinCount: dayCheckins.length,
          checkinData: dayCheckins
        });
      }
      
      return calendarDays;
    },
  
    // 判断是否为今天
    isToday: function(dateStr) {
      var today = new Date();
      var todayStr = today.getFullYear() + '-' + 
                     (today.getMonth() + 1 < 10 ? '0' + (today.getMonth() + 1) : (today.getMonth() + 1)) + '-' + 
                     (today.getDate() < 10 ? '0' + today.getDate() : today.getDate());
      return dateStr === todayStr;
    },
  
    // 计算统计
    calculateStats: function(checkins, projects) {
      // 获取所有打卡日期
      var dates = [];
      for (var i = 0; i < checkins.length; i++) {
        var checkin = checkins[i];
        if (checkin && checkin.date) {
          if (dates.indexOf(checkin.date) === -1) {
            dates.push(checkin.date);
          }
        }
      }
      
      // 计算连续打卡
      var streak = this.calculateStreak(checkins);
      
      // 计算完成率
      var completionRate = 0;
      if (projects.length > 0) {
        var daysInMonth = this.getDaysInMonth(this.data.currentMonth);
        var expectedCheckins = projects.length * daysInMonth;
        var actualCheckins = checkins.length;
        completionRate = expectedCheckins > 0 ? Math.round((actualCheckins / expectedCheckins) * 100) : 0;
      }
      
      return {
        totalDays: dates.length,
        currentStreak: streak.current,
        maxStreak: streak.max,
        completionRate: completionRate
      };
    },
  
    // 获取月份天数
    getDaysInMonth: function(month) {
      var parts = month.split('-');
      var year = parseInt(parts[0]);
      var monthNum = parseInt(parts[1]);
      return new Date(year, monthNum, 0).getDate();
    },
  
    // 计算连续打卡
    calculateStreak: function(checkins) {
      // 获取所有打卡日期并去重
      var dates = [];
      for (var i = 0; i < checkins.length; i++) {
        var checkin = checkins[i];
        if (checkin && checkin.date) {
          if (dates.indexOf(checkin.date) === -1) {
            dates.push(checkin.date);
          }
        }
      }
      
      // 排序
      dates.sort();
      
      var currentStreak = 0;
      var maxStreak = 0;
      
      if (dates.length > 0) {
        // 计算最大连续天数
        var tempStreak = 1;
        for (var i = 1; i < dates.length; i++) {
          var prevDate = new Date(dates[i - 1]);
          var currDate = new Date(dates[i]);
          var diffDays = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
            tempStreak++;
            if (tempStreak > maxStreak) {
              maxStreak = tempStreak;
            }
          } else {
            tempStreak = 1;
          }
        }
        
        // 检查今天是否打卡
        var today = new Date();
        var todayStr = today.getFullYear() + '-' + 
                       (today.getMonth() + 1 < 10 ? '0' + (today.getMonth() + 1) : (today.getMonth() + 1)) + '-' + 
                       (today.getDate() < 10 ? '0' + today.getDate() : today.getDate());
        
        if (dates.indexOf(todayStr) !== -1) {
          currentStreak = 1;
          // 往前推
          var checkDate = new Date(today);
          for (var i = 1; i < 365; i++) {
            checkDate.setDate(today.getDate() - i);
            var checkDateStr = checkDate.getFullYear() + '-' + 
                              (checkDate.getMonth() + 1 < 10 ? '0' + (checkDate.getMonth() + 1) : (checkDate.getMonth() + 1)) + '-' + 
                              (checkDate.getDate() < 10 ? '0' + checkDate.getDate() : checkDate.getDate());
            
            if (dates.indexOf(checkDateStr) !== -1) {
              currentStreak++;
            } else {
              break;
            }
          }
        }
      }
      
      return {
        current: currentStreak,
        max: Math.max(maxStreak, 1)
      };
    },
  
    // 项目选择变化
    onProjectChange: function (e) {
      var index = parseInt(e.detail.value);
      var projects = this.data.projects;
      
      if (index === -1 || index >= projects.length) {
        this.setData({
          selectedProjectIndex: -1,
          selectedProject: { name: '全部项目' }
        });
      } else {
        this.setData({
          selectedProjectIndex: index,
          selectedProject: projects[index]
        });
      }
      
      this.filterData();
    },
  
    // 月份选择变化
    onMonthChange: function (e) {
      var dateStr = e.detail.value;
      var parts = dateStr.split('-');
      var year = parseInt(parts[0]);
      var month = parseInt(parts[1]);
      
      this.setData({
        currentMonth: dateStr,
        displayMonth: year + '年' + month + '月'
      });
      
      this.loadData();
    },
  
    // 上一个月
    prevMonth: function () {
      var parts = this.data.currentMonth.split('-');
      var year = parseInt(parts[0]);
      var month = parseInt(parts[1]);
      
      month--;
      if (month < 1) {
        month = 12;
        year--;
      }
      
      var monthStr = month < 10 ? '0' + month : month.toString();
      var newMonth = year + '-' + monthStr;
      
      this.setData({
        currentMonth: newMonth,
        displayMonth: year + '年' + month + '月'
      });
      
      this.loadData();
    },
  
    // 下一个月
    nextMonth: function () {
      var parts = this.data.currentMonth.split('-');
      var year = parseInt(parts[0]);
      var month = parseInt(parts[1]);
      
      month++;
      if (month > 12) {
        month = 1;
        year++;
      }
      
      var monthStr = month < 10 ? '0' + month : month.toString();
      var newMonth = year + '-' + monthStr;
      
      this.setData({
        currentMonth: newMonth,
        displayMonth: year + '年' + month + '月'
      });
      
      this.loadData();
    },
  
    // 点击日期
    onDayTap: function (e) {
      var date = e.currentTarget.dataset.date;
      var calendarDays = this.data.calendarDays;
      
      // 查找对应的日期数据
      var dayData = null;
      for (var i = 0; i < calendarDays.length; i++) {
        if (calendarDays[i].fullDate === date) {
          dayData = calendarDays[i];
          break;
        }
      }
      
      if (!dayData) return;
      
      var checkins = dayData.checkinData || [];
      
      // 如果选择了特定项目，则过滤
      if (this.data.selectedProject.id) {
        var filtered = [];
        for (var i = 0; i < checkins.length; i++) {
          if (checkins[i].projectId === this.data.selectedProject.id) {
            filtered.push(checkins[i]);
          }
        }
        checkins = filtered;
      }
      
      this.setData({
        selectedDate: date,
        selectedDayCheckins: checkins
      });
    },
  
    // 过滤数据
    filterData: function () {
      var rawCheckins = wx.getStorageSync('checkin_records') || [];
      var checkins = this.formatCheckinData(rawCheckins);
      var currentMonth = this.data.currentMonth;
      var selectedProject = this.data.selectedProject;
      
      // 过滤当月的记录
      var filteredCheckins = [];
      for (var i = 0; i < checkins.length; i++) {
        var checkin = checkins[i];
        if (checkin && checkin.date && checkin.date.indexOf(currentMonth) !== -1) {
          if (!selectedProject.id || checkin.projectId === selectedProject.id) {
            filteredCheckins.push(checkin);
          }
        }
      }
      
      // 重新生成日历
      var calendarDays = this.generateCalendar(currentMonth, filteredCheckins);
      
      // 重新计算统计
      var stats = this.calculateStats(filteredCheckins, this.data.projects);
      
      this.setData({
        calendarDays: calendarDays,
        stats: stats,
        selectedDate: null,
        selectedDayCheckins: []
      });
    },
  
    // 获取日期样式类名
    getDayClass: function (day) {
      var className = '';
      
      if (!day.isCurrentMonth) {
        className += ' other-month';
      }
      
      if (day.isToday) {
        className += ' today';
      }
      
      if (day.hasCheckin) {
        className += ' has-checkin';
      }
      
      return className;
    },
  
    // 删除打卡记录
    onDeleteCheckin: function (e) {
      var checkinId = e.currentTarget.dataset.id;
      var that = this;
      
      wx.showModal({
        title: '删除确认',
        content: '确定要删除这条打卡记录吗？',
        success: function(res) {
          if (res.confirm) {
            // 从本地存储中删除
            var checkins = wx.getStorageSync('checkin_records') || [];
            var newCheckins = [];
            
            for (var i = 0; i < checkins.length; i++) {
              if (checkins[i].id !== checkinId) {
                newCheckins.push(checkins[i]);
              }
            }
            
            wx.setStorageSync('checkin_records', newCheckins);
            
            // 重新加载数据
            that.loadData();
            
            // 更新详情列表
            var selectedCheckins = that.data.selectedDayCheckins;
            var updatedCheckins = [];
            for (var i = 0; i < selectedCheckins.length; i++) {
              if (selectedCheckins[i].id !== checkinId) {
                updatedCheckins.push(selectedCheckins[i]);
              }
            }
            
            that.setData({
              selectedDayCheckins: updatedCheckins
            });
            
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });
          }
        }
      });
    },
  
    // 添加手动清理重复记录的方法
    manualCleanDuplicates: function() {
      var that = this;
      wx.showModal({
        title: '清理重复记录',
        content: '确定要清理所有重复的打卡记录吗？',
        success: function(res) {
          if (res.confirm) {
            that.cleanInvalidData();
            that.loadData();
            wx.showToast({
              title: '清理完成',
              icon: 'success'
            });
          }
        }
      });
    }
  });