// pages/analysis/analysis.js
Page({
    data: {
      isLoading: true,
      currentMonth: '',
      displayMonth: '',
      timeRange: 'month',
      summary: {
        totalDays: 0,
        totalCheckins: 0,
        completionRate: 0,
        daysTrend: 0,
        checkinsTrend: 0,
        rateTrend: 0
      },
      projectStats: [],
      streakStats: {
        currentStreak: 0,
        maxStreak: 0,
        avgStreak: 0,
        totalStreaks: 0
      },
      weekDays: ['一', '二', '三', '四', '五', '六', '日']
    },
  
    onLoad: function () {
      console.log('数据分析页面加载');
      this.initDate();
      this.loadData();
    },
  
    onShow: function () {
      console.log('数据分析页面显示');
      this.loadData();
    },
  
    onPullDownRefresh: function () {
      console.log('下拉刷新');
      this.loadData();
      var that = this;
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
      var that = this;
      this.setData({ isLoading: true });
      
      setTimeout(function() {
        try {
          // 加载基础数据
          var projects = that.loadProjects();
          var checkins = that.loadCheckins();
          
          // 计算统计摘要
          var summary = that.calculateSummary(checkins, projects);
          
          // 计算项目统计
          var projectStats = that.calculateProjectStats(checkins, projects);
          
          // 计算连续打卡统计
          var streakStats = that.calculateStreakStats(checkins);
          
          // 计算趋势数据
          var trends = that.calculateTrends(checkins, projects, summary);
          summary.daysTrend = trends.daysTrend;
          summary.checkinsTrend = trends.checkinsTrend;
          summary.rateTrend = trends.rateTrend;
          
          that.setData({
            summary: summary,
            projectStats: projectStats,
            streakStats: streakStats,
            isLoading: false
          });
          
          // 初始化图表
          setTimeout(function() {
            that.initCharts(checkins, projects);
          }, 100);
          
        } catch (error) {
          console.error('加载数据失败:', error);
          that.setData({ 
            isLoading: false,
            projectStats: [],
            streakStats: {
              currentStreak: 0,
              maxStreak: 0,
              avgStreak: 0,
              totalStreaks: 0
            }
          });
        }
      }, 300);
    },
  
    // 加载项目
    loadProjects: function() {
      try {
        var projects = wx.getStorageSync('projects') || [];
        console.log('加载到的项目:', projects);
        // 确保每个项目都有必要的字段
        projects.forEach(function(project, index) {
          if (!project.id) project.id = 'project_' + Date.now() + '_' + index;
          if (!project.name) project.name = '未命名项目' + (index + 1);
          if (!project.createdAt) project.createdAt = new Date().toISOString();
          // 确保有目标天数，默认为30天
          if (!project.targetDays) project.targetDays = 30;
        });
        return projects;
      } catch (error) {
        console.error('加载项目失败:', error);
        return [];
      }
    },
  
    // 加载打卡记录 - 修复时间处理
    loadCheckins: function() {
      try {
        var checkins = wx.getStorageSync('checkin_records') || [];
        
        var formattedCheckins = [];
        
        console.log('原始打卡记录数量:', checkins.length);
        
        for (var i = 0; i < checkins.length; i++) {
          var checkin = checkins[i];
          
          if (checkin && checkin.date) {
            try {
              // 方法1: 优先使用保存的本地时间
              var hour;
              var dateObj;
              var localDateStr;
              
              console.log('处理第' + (i+1) + '条记录:', {
                rawDate: checkin.date,
                localDate: checkin.localDate,
                localHour: checkin.localHour
              });
              
              // 如果保存了本地小时，优先使用
              if (checkin.localHour !== undefined) {
                hour = parseInt(checkin.localHour);
                
                // 使用本地日期字符串创建日期对象
                if (checkin.localDate) {
                  try {
                    // 格式: YYYY-MM-DDTHH:mm:ss 或 YYYY-MM-DD HH:mm:ss
                    var dateStr = checkin.localDate.replace('T', ' ');
                    dateObj = new Date(dateStr);
                    
                    // 如果解析失败，使用当前时间
                    if (isNaN(dateObj.getTime())) {
                      console.warn('本地日期解析失败，使用当前时间:', checkin.localDate);
                      dateObj = new Date();
                    }
                  } catch (e) {
                    console.warn('本地日期解析异常，使用当前时间:', e);
                    dateObj = new Date();
                  }
                } else {
                  // 如果没有本地日期，使用date字段
                  try {
                    dateObj = new Date(checkin.date);
                    if (isNaN(dateObj.getTime())) {
                      dateObj = new Date();
                    }
                  } catch (e) {
                    dateObj = new Date();
                  }
                }
                
                console.log('使用保存的本地小时:', hour);
              } else {
                // 方法2: 老版本数据，从date字段解析
                try {
                  dateObj = new Date(checkin.date);
                  if (isNaN(dateObj.getTime())) {
                    console.warn('日期无效，使用当前时间:', checkin.date);
                    dateObj = new Date();
                  }
                  
                  // 获取本地时间的小时
                  hour = dateObj.getHours();
                  console.log('从date字段解析小时:', hour);
                } catch (e) {
                  console.warn('日期解析异常，使用当前时间:', e);
                  dateObj = new Date();
                  hour = dateObj.getHours();
                }
              }
              
              // 确保hour是有效的数字
              if (isNaN(hour) || hour < 0 || hour > 23) {
                console.warn('小时无效，使用当前时间的小时:', hour);
                hour = new Date().getHours();
              }
              
              // 创建本地日期字符串
              var year = dateObj.getFullYear();
              var month = dateObj.getMonth() + 1;
              var day = dateObj.getDate();
              
              localDateStr = year + '-' + 
                            (month < 10 ? '0' + month : month) + '-' + 
                            (day < 10 ? '0' + day : day);
              
              console.log('第' + (i+1) + '条记录处理结果:', {
                finalHour: hour,
                localDateStr: localDateStr,
                finalDateObj: dateObj
              });
              
              // 计算星期几（周一为0）
              var dayOfWeek = dateObj.getDay();
              if (dayOfWeek === 0) {
                dayOfWeek = 6;
              } else {
                dayOfWeek = dayOfWeek - 1;
              }
              
              formattedCheckins.push({
                id: checkin.id || 'checkin_' + Date.now() + '_' + i,
                projectId: checkin.projectId || '',
                date: checkin.date,
                dateStr: localDateStr,
                year: year,
                month: month,
                day: day,
                dayOfWeek: dayOfWeek,
                hour: hour,
                projectName: checkin.projectName || '',
                notes: checkin.notes || ''
              });
              
            } catch (e) {
              console.error('格式化打卡记录失败:', checkin, e);
            }
          }
        }
        
        console.log('格式化后的打卡记录:', formattedCheckins.length);
        return formattedCheckins;
      } catch (error) {
        console.error('加载打卡记录失败:', error);
        return [];
      }
    },
  
    // 计算统计摘要
    calculateSummary: function(checkins, projects) {
      // 计算总天数（去重）
      var uniqueDates = [];
      for (var i = 0; i < checkins.length; i++) {
        var dateStr = checkins[i].dateStr;
        if (uniqueDates.indexOf(dateStr) === -1) {
          uniqueDates.push(dateStr);
        }
      }
      var totalDays = uniqueDates.length;
      
      // 计算总次数
      var totalCheckins = checkins.length;
      
      // 计算平均完成率（基于所有项目的实际完成率）
      var completionRate = 0;
      if (projects.length > 0) {
        var projectStats = this.calculateProjectStats(checkins, projects);
        var totalRate = 0;
        var validProjects = 0;
        for (var i = 0; i < projectStats.length; i++) {
          if (projectStats[i].completionRate >= 0) {
            totalRate += projectStats[i].completionRate;
            validProjects++;
          }
        }
        completionRate = validProjects > 0 ? Math.round(totalRate / validProjects) : 0;
      }
      
      return {
        totalDays: totalDays,
        totalCheckins: totalCheckins,
        completionRate: completionRate,
        daysTrend: 0,
        checkinsTrend: 0,
        rateTrend: 0
      };
    },
  
    // 计算趋势数据
    calculateTrends: function(checkins, projects, currentSummary) {
      // 简化趋势计算
      var daysTrend = 0;
      var checkinsTrend = 0;
      var rateTrend = 0;
      
      // 如果有打卡记录，给一个正趋势
      if (currentSummary.totalDays > 0) {
        daysTrend = 5;
      }
      if (currentSummary.totalCheckins > 0) {
        checkinsTrend = 5;
      }
      if (currentSummary.completionRate > 0) {
        rateTrend = 5;
      }
      
      return {
        daysTrend: daysTrend,
        checkinsTrend: checkinsTrend,
        rateTrend: rateTrend
      };
    },
  
    // 计算项目统计
    calculateProjectStats: function(checkins, projects) {
      var result = [];
      
      for (var p = 0; p < projects.length; p++) {
        var project = projects[p];
        var projectCheckins = [];
        
        // 筛选该项目的打卡记录
        for (var i = 0; i < checkins.length; i++) {
          if (checkins[i].projectId === project.id) {
            projectCheckins.push(checkins[i]);
          }
        }
        
        // 计算唯一日期（实际打卡天数）
        var uniqueDates = [];
        for (var i = 0; i < projectCheckins.length; i++) {
          var dateStr = projectCheckins[i].dateStr;
          if (uniqueDates.indexOf(dateStr) === -1) {
            uniqueDates.push(dateStr);
          }
        }
        var actualDays = uniqueDates.length; // 实际打卡天数
        
        // 获取计划天数
        var targetDays = project.targetDays || 30;
        
        // 计算完成率
        var completionRate = 0;
        if (targetDays > 0) {
          completionRate = Math.min(Math.round((actualDays / targetDays) * 100), 100);
        }
        
        // 计算连续打卡
        var currentStreak = this.calculateCurrentStreak(projectCheckins);
        
        result.push({
          id: project.id,
          name: project.name || '未命名',
          targetDays: targetDays,
          actualDays: actualDays,
          totalDays: actualDays,
          completionRate: completionRate,
          currentStreak: currentStreak
        });
        
        console.log('项目统计:', {
          name: project.name,
          targetDays: targetDays,
          actualDays: actualDays,
          completionRate: completionRate + '%'
        });
      }
      
      return result;
    },
    
    // 计算当前连续打卡
    calculateCurrentStreak: function(projectCheckins) {
      if (projectCheckins.length === 0) return 0;
      
      // 获取所有日期并排序
      var dates = [];
      for (var i = 0; i < projectCheckins.length; i++) {
        var dateStr = projectCheckins[i].dateStr;
        if (dates.indexOf(dateStr) === -1) {
          dates.push(dateStr);
        }
      }
      
      // 按日期降序排序
      dates.sort().reverse();
      
      if (dates.length === 0) return 0;
      
      var streak = 0;
      var today = new Date();
      var todayStr = today.getFullYear() + '-' + 
                     (today.getMonth() + 1 < 10 ? '0' + (today.getMonth() + 1) : today.getMonth() + 1) + '-' + 
                     (today.getDate() < 10 ? '0' + today.getDate() : today.getDate());
      
      // 从今天或昨天开始检查
      var startDateStr = dates[0] === todayStr ? todayStr : this.getYesterdayStr();
      
      if (dates[0] === startDateStr) {
        streak = 1;
        // 往前检查连续天数
        for (var i = 1; i < dates.length; i++) {
          var prevDate = new Date(dates[i - 1]);
          var currDate = new Date(dates[i]);
          var diffDays = Math.floor((prevDate - currDate) / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
            streak++;
          } else {
            break;
          }
        }
      }
      
      return streak;
    },
    
    // 获取昨天日期字符串
    getYesterdayStr: function() {
      var yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday.getFullYear() + '-' + 
             (yesterday.getMonth() + 1 < 10 ? '0' + (yesterday.getMonth() + 1) : yesterday.getMonth() + 1) + '-' + 
             (yesterday.getDate() < 10 ? '0' + yesterday.getDate() : yesterday.getDate());
    },
  
    // 计算连续打卡统计
    calculateStreakStats: function(checkins) {
      // 获取所有日期
      var dates = [];
      for (var i = 0; i < checkins.length; i++) {
        var dateStr = checkins[i].dateStr;
        if (dates.indexOf(dateStr) === -1) {
          dates.push(dateStr);
        }
      }
      
      dates.sort();
      
      var currentStreak = 0;
      var maxStreak = 0;
      var totalStreaks = 0;
      var currentStreakLength = 1;
      var streaks = [];
      
      if (dates.length > 0) {
        // 计算最长连续
        for (var i = 1; i < dates.length; i++) {
          var prevDate = new Date(dates[i - 1]);
          var currDate = new Date(dates[i]);
          var diffDays = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
            currentStreakLength++;
            if (currentStreakLength > maxStreak) {
              maxStreak = currentStreakLength;
            }
          } else {
            if (currentStreakLength > 1) {
              streaks.push(currentStreakLength);
              totalStreaks++;
            }
            currentStreakLength = 1;
          }
        }
        
        if (currentStreakLength > 1) {
          streaks.push(currentStreakLength);
          totalStreaks++;
        }
        
        // 计算当前连续
        var today = new Date();
        var todayStr = today.getFullYear() + '-' + 
                       (today.getMonth() + 1 < 10 ? '0' + (today.getMonth() + 1) : today.getMonth() + 1) + '-' + 
                       (today.getDate() < 10 ? '0' + today.getDate() : today.getDate());
        
        if (dates.indexOf(todayStr) !== -1) {
          currentStreak = 1;
          var checkDate = new Date(today);
          
          for (var i = 0; i < 30; i++) { // 只检查最近30天
            checkDate.setDate(checkDate.getDate() - 1);
            var checkDateStr = checkDate.getFullYear() + '-' + 
                              (checkDate.getMonth() + 1 < 10 ? '0' + (checkDate.getMonth() + 1) : checkDate.getMonth() + 1) + '-' + 
                              (checkDate.getDate() < 10 ? '0' + checkDate.getDate() : checkDate.getDate());
            
            if (dates.indexOf(checkDateStr) !== -1) {
              currentStreak++;
            } else {
              break;
            }
          }
        }
      }
      
      // 计算平均连续
      var avgStreak = 0;
      if (streaks.length > 0) {
        var sum = 0;
        for (var i = 0; i < streaks.length; i++) {
          sum += streaks[i];
        }
        avgStreak = Math.round(sum / streaks.length);
      }
      
      return {
        currentStreak: currentStreak,
        maxStreak: maxStreak,
        avgStreak: avgStreak,
        totalStreaks: totalStreaks
      };
    },
  
    // 初始化图表
    initCharts: function(checkins, projects) {
      // 1. 每日打卡趋势图
      this.initDailyTrendChart(checkins);
      
      // 2. 项目完成率饼图
      this.initProjectPieChart(checkins, projects);
      
      // 3. 周内打卡热度图
      this.initWeekHeatChart(checkins);
      
      // 4. 时段分布图
      this.initTimeDistributionChart(checkins);
      
      // 5. 连续打卡统计图
      this.initStreakChart(checkins);
      
      // 6. 月度对比图
      this.initMonthlyChart(checkins);
    },
  
    // 1. 每日打卡趋势图
    initDailyTrendChart: function(checkins) {
      try {
        var ctx = wx.createCanvasContext('dailyChart');
        
        var chartHeight = 80;
        var chartBottom = 100;
        var chartTop = 20;
        var chartLeft = 30;
        var chartRight = 320;
        
        // 生成最近30天的数据
        var data = [];
        var dates = [];
        var today = new Date();
        
        for (var i = 29; i >= 0; i--) {
          var date = new Date(today);
          date.setDate(today.getDate() - i);
          var dateStr = date.getFullYear() + '-' + 
                        (date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1) + '-' + 
                        (date.getDate() < 10 ? '0' + date.getDate() : date.getDate());
          dates.push(date.getDate() + '日');
          
          // 计算当天的打卡次数
          var dayCheckins = 0;
          for (var j = 0; j < checkins.length; j++) {
            if (checkins[j].dateStr === dateStr) {
              dayCheckins++;
            }
          }
          data.push(dayCheckins);
        }
        
        var maxValue = Math.max.apply(Math, data);
        if (maxValue === 0) {
          ctx.setFontSize(14);
          ctx.setFillStyle('#999');
          ctx.setTextAlign('center');
          ctx.fillText('暂无打卡数据', 175, chartBottom - chartHeight/2);
          ctx.draw();
          return;
        }
        
        // 绘制坐标轴
        ctx.setStrokeStyle('#e8e8e8');
        ctx.setLineWidth(1);
        ctx.moveTo(chartLeft, chartBottom);
        ctx.lineTo(chartRight, chartBottom);
        ctx.moveTo(chartLeft, chartTop);
        ctx.lineTo(chartLeft, chartBottom);
        ctx.stroke();
        
        // 绘制数据线
        ctx.setStrokeStyle('#1890ff');
        ctx.setLineWidth(2);
        ctx.beginPath();
        
        for (var i = 0; i < data.length; i++) {
          var x = chartLeft + (i * (chartRight - chartLeft) / (data.length - 1));
          var y = chartBottom - (data[i] * chartHeight / maxValue);
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        
        ctx.stroke();
        
        // 绘制标签
        ctx.setFontSize(12);
        ctx.setFillStyle('#666');
        ctx.textAlign = 'center';
        
        // 只绘制部分日期标签
        for (var i = 0; i < dates.length; i += 10) {
          var x = chartLeft + (i * (chartRight - chartLeft) / (data.length - 1));
          ctx.fillText(dates[i], x, chartBottom + 15);
        }
        
        ctx.draw();
      } catch (error) {
        console.error('绘制每日趋势图失败:', error);
      }
    },
  
    // 2. 项目完成率饼图
    initProjectPieChart: function(checkins, projects) {
      try {
        var ctx = wx.createCanvasContext('projectPieChart');
        
        var centerX = 175;
        var centerY = 70;
        var radius = 40;
        
        var projectStats = this.data.projectStats || [];
        
        if (projectStats.length === 0) {
          ctx.setFontSize(14);
          ctx.setFillStyle('#999');
          ctx.setTextAlign('center');
          ctx.fillText('暂无项目数据', centerX, centerY);
          ctx.draw();
          return;
        }
        
        var totalRate = 0;
        for (var i = 0; i < projectStats.length; i++) {
          totalRate += projectStats[i].completionRate || 0;
        }
        
        if (totalRate === 0) {
          ctx.setFontSize(14);
          ctx.setFillStyle('#999');
          ctx.setTextAlign('center');
          ctx.fillText('暂无完成数据', centerX, centerY);
          ctx.draw();
          return;
        }
        
        var startAngle = -Math.PI / 2;
        var colors = ['#1890ff', '#52c41a', '#722ed1', '#fa8c16', '#eb2f96', '#13c2c2', '#f759ab', '#9254de'];
        
        for (var i = 0; i < projectStats.length; i++) {
          var item = projectStats[i];
          var value = item.completionRate || 0;
          var angle = (value / totalRate) * Math.PI * 2;
          var endAngle = startAngle + angle;
          
          ctx.setFillStyle(colors[i % colors.length]);
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.arc(centerX, centerY, radius, startAngle, endAngle);
          ctx.closePath();
          ctx.fill();
          
          ctx.setStrokeStyle('white');
          ctx.setLineWidth(1);
          ctx.stroke();
          
          startAngle = endAngle;
        }
        
        var avgRate = Math.round(totalRate / projectStats.length);
        ctx.setFontSize(16);
        ctx.setFillStyle('#333');
        ctx.setTextAlign('center');
        ctx.fillText(avgRate + '%', centerX, centerY);
        
        ctx.setFontSize(12);
        ctx.setFillStyle('#666');
        ctx.fillText('平均完成率', centerX, centerY + 16);
        
        ctx.draw();
      } catch (error) {
        console.error('绘制饼图失败:', error);
      }
    },
  
    // 3. 周内打卡热度图
    initWeekHeatChart: function(checkins) {
      try {
        var ctx = wx.createCanvasContext('weekHeatChart');
        
        var chartHeight = 80;
        var chartBottom = 100;
        var chartTop = 20;
        
        // 按星期分组统计
        var weekData = [0, 0, 0, 0, 0, 0, 0];
        for (var i = 0; i < checkins.length; i++) {
          var checkin = checkins[i];
          if (checkin.dayOfWeek >= 0 && checkin.dayOfWeek < 7) {
            weekData[checkin.dayOfWeek]++;
          }
        }
        
        var maxValue = Math.max.apply(Math, weekData);
        if (maxValue === 0) {
          ctx.setFontSize(14);
          ctx.setFillStyle('#999');
          ctx.setTextAlign('center');
          ctx.fillText('暂无打卡数据', 175, chartBottom - chartHeight/2);
          ctx.draw();
          return;
        }
        
        var colors = ['#e6f7ff', '#bae7ff', '#91d5ff', '#69c0ff', '#40a9ff', '#1890ff', '#096dd9'];
        
        // 绘制热力图 - 居中显示
        var barWidth = 30;
        var spacing = 5;
        var totalWidth = (barWidth + spacing) * 7 - spacing;
        var startX = (350 - totalWidth) / 2;
        
        for (var i = 0; i < 7; i++) {
          var x = startX + i * (barWidth + spacing);
          var height = (weekData[i] * chartHeight) / maxValue;
          var y = chartBottom - height;
          var colorIndex = Math.min(Math.floor((weekData[i] / maxValue) * colors.length), colors.length - 1);
          
          ctx.setFillStyle(colors[colorIndex]);
          ctx.fillRect(x, y, barWidth, height);
          
          ctx.setFontSize(10);
          ctx.setFillStyle('#333');
          ctx.setTextAlign('center');
          
          if (weekData[i] > 0) {
            ctx.fillText(weekData[i].toString(), x + barWidth / 2, y - 5);
          }
        }
        
        ctx.draw();
      } catch (error) {
        console.error('绘制周热度图失败:', error);
      }
    },
  
    // 4. 时段分布图 - 修复时间处理
    initTimeDistributionChart: function(checkins) {
      try {
        var ctx = wx.createCanvasContext('timeDistributionChart');
        
        var centerX = 120;
        var centerY = 70;
        var radius = 45;
        var innerRadius = 28;
        
        var timeGroups = [0, 0, 0, 0, 0];
        var timeLabels = ['凌晨', '上午', '中午', '下午', '晚上'];
        var timeColors = ['#722ed1', '#1890ff', '#52c41a', '#fa8c16', '#eb2f96'];
        
        console.log('=== 时段分布图分析开始 ===');
        console.log('打卡记录总数:', checkins.length);
        
        for (var i = 0; i < checkins.length; i++) {
          var checkin = checkins[i];
          var hour = checkin.hour;
          var dateStr = checkin.dateStr;
          
          console.log('第' + (i+1) + '条记录:', {
            hour: hour,
            dateStr: dateStr,
            type: typeof hour
          });
          
          // 确保hour是有效的数字
          if (hour === undefined || hour === null) {
            console.warn('小时无效:', hour);
            continue;
          }
          
          hour = parseInt(hour);
          if (isNaN(hour) || hour < 0 || hour > 23) {
            console.warn('小时无效:', hour);
            continue;
          }
          
          // 时间分组
          if (hour >= 0 && hour < 6) {
            timeGroups[0]++;      // 凌晨 0:00-5:59
            console.log('  分类: 凌晨 (' + hour + '时)');
          } else if (hour >= 6 && hour < 12) {
            timeGroups[1]++;      // 上午 6:00-11:59
            console.log('  分类: 上午 (' + hour + '时)');
          } else if (hour >= 12 && hour < 14) {
            timeGroups[2]++;      // 中午 12:00-13:59
            console.log('  分类: 中午 (' + hour + '时)');
          } else if (hour >= 14 && hour < 18) {
            timeGroups[3]++;      // 下午 14:00-17:59
            console.log('  分类: 下午 (' + hour + '时)');
          } else if (hour >= 18 && hour <= 23) {
            timeGroups[4]++;      // 晚上 18:00-23:59
            console.log('  分类: 晚上 (' + hour + '时)');
          }
        }
        
        console.log('时段分组结果:', timeGroups);
        console.log('各时段打卡数:', {
          凌晨: timeGroups[0],
          上午: timeGroups[1],
          中午: timeGroups[2],
          下午: timeGroups[3],
          晚上: timeGroups[4]
        });
        console.log('=== 时段分布图分析结束 ===');
        
        var total = 0;
        for (var i = 0; i < timeGroups.length; i++) {
          total += timeGroups[i];
        }
        
        console.log('打卡总数:', total);
        
        if (total === 0) {
          ctx.setFontSize(14);
          ctx.setFillStyle('#999');
          ctx.setTextAlign('center');
          ctx.fillText('暂无打卡数据', 175, 70);
          
          var legendX = centerX + 100;
          for (var i = 0; i < timeLabels.length; i++) {
            var y = 30 + i * 25;
            
            ctx.setFillStyle(timeColors[i]);
            ctx.fillRect(legendX, y, 14, 14);
            
            ctx.setFontSize(12);
            ctx.setFillStyle('#333');
            ctx.fillText(timeLabels[i] + ' (0)', legendX + 20, y + 11);
          }
          
          ctx.draw();
          return;
        }
        
        // 绘制饼图
        var startAngle = -Math.PI / 2;
        
        for (var i = 0; i < timeGroups.length; i++) {
          var value = timeGroups[i];
          if (value === 0) continue;
          
          var angle = (value / total) * Math.PI * 2;
          var endAngle = startAngle + angle;
          
          ctx.setFillStyle(timeColors[i]);
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, startAngle, endAngle);
          ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
          ctx.closePath();
          ctx.fill();
          
          ctx.setStrokeStyle('#fff');
          ctx.setLineWidth(1);
          ctx.stroke();
          
          startAngle = endAngle;
        }
        
        // 绘制中心文字
        ctx.setFontSize(18);
        ctx.setFillStyle('#333');
        ctx.setTextAlign('center');
        ctx.fillText(total.toString(), centerX, centerY);
        
        ctx.setFontSize(12);
        ctx.setFillStyle('#666');
        ctx.fillText('总数', centerX, centerY + 20);
        
        // 绘制图例
        var legendX = centerX + radius + 40;
        var legendStartY = centerY - 50;
        
        for (var i = 0; i < timeLabels.length; i++) {
          var y = legendStartY + i * 25;
          
          ctx.setFillStyle(timeColors[i]);
          ctx.fillRect(legendX, y, 16, 16);
          
          ctx.setStrokeStyle('#e8e8e8');
          ctx.setLineWidth(1);
          ctx.strokeRect(legendX, y, 16, 16);
          
          ctx.setFontSize(14);
          ctx.setFillStyle('#333');
          ctx.setTextAlign('left');
          
          var labelText = timeLabels[i];
          var countText = timeGroups[i].toString();
          
          ctx.fillText(labelText, legendX + 22, y + 12);
          
          ctx.setFillStyle('#1890ff');
          ctx.fillText(' (' + countText + ')', legendX + 22 + ctx.measureText(labelText).width, y + 12);
        }
        
        ctx.draw();
        
      } catch (error) {
        console.error('绘制时段分布图失败:', error);
      }
    },
  
    // 5. 连续打卡统计图
    initStreakChart: function(checkins) {
      try {
        var ctx = wx.createCanvasContext('streakChart');
        
        var chartHeight = 80;
        var chartBottom = 100;
        var chartTop = 20;
        
        var streaks = this.getStreakHistory(checkins);
        
        if (streaks.length === 0) {
          ctx.setFontSize(14);
          ctx.setFillStyle('#999');
          ctx.setTextAlign('center');
          ctx.fillText('暂无连续打卡记录', 175, chartBottom - chartHeight/2);
          ctx.draw();
          return;
        }
        
        var maxStreak = Math.max.apply(Math, streaks);
        if (maxStreak === 0) maxStreak = 1;
        
        ctx.setFillStyle('#fa8c16');
        
        var barCount = Math.min(streaks.length, 6);
        var barWidth = 25;
        var spacing = 8;
        var totalWidth = (barWidth + spacing) * barCount - spacing;
        var startX = (350 - totalWidth) / 2;
        
        for (var i = 0; i < barCount; i++) {
          var value = streaks[i];
          var x = startX + i * (barWidth + spacing);
          var height = (value / maxStreak) * chartHeight;
          var y = chartBottom - height;
          
          ctx.fillRect(x, y, barWidth, height);
          
          ctx.setStrokeStyle('#e8e8e8');
          ctx.setLineWidth(1);
          ctx.strokeRect(x, y, barWidth, height);
          
          ctx.setFontSize(10);
          ctx.setFillStyle('#333');
          ctx.setTextAlign('center');
          
          if (value > 0) {
            ctx.fillText(value.toString(), x + barWidth / 2, y - 5);
          }
          
          ctx.setFillStyle('#666');
          ctx.fillText((i + 1).toString(), x + barWidth / 2, chartBottom + 8);
        }
        
        ctx.draw();
      } catch (error) {
        console.error('绘制连续打卡图失败:', error);
      }
    },
  
    // 6. 月度对比图
    initMonthlyChart: function(checkins) {
      try {
        var ctx = wx.createCanvasContext('monthlyChart');
        
        var chartHeight = 80;
        var chartBottom = 100;
        var chartTop = 20;
        var chartLeft = 30;
        var chartRight = 320;
        
        // 生成最近6个月的数据
        var months = [];
        var monthData = [];
        var today = new Date();
        
        for (var i = 5; i >= 0; i--) {
          var date = new Date(today.getFullYear(), today.getMonth() - i, 1);
          var monthStr = (date.getMonth() + 1) + '月';
          months.push(monthStr);
          
          var monthCheckins = 0;
          for (var j = 0; j < checkins.length; j++) {
            if (checkins[j].year === date.getFullYear() && checkins[j].month === date.getMonth() + 1) {
              monthCheckins++;
            }
          }
          monthData.push(monthCheckins);
        }
        
        var maxValue = Math.max.apply(Math, monthData);
        if (maxValue === 0) {
          ctx.setFontSize(14);
          ctx.setFillStyle('#999');
          ctx.setTextAlign('center');
          ctx.fillText('暂无打卡数据', 175, chartBottom - chartHeight/2);
          ctx.draw();
          return;
        }
        
        // 绘制背景网格
        ctx.setStrokeStyle('#f0f0f0');
        ctx.setLineWidth(1);
        
        for (var i = 0; i <= 4; i++) {
          var y = chartTop + i * (chartHeight / 4);
          ctx.moveTo(chartLeft, y);
          ctx.lineTo(chartRight, y);
        }
        ctx.stroke();
        
        // 绘制坐标轴
        ctx.setStrokeStyle('#e8e8e8');
        ctx.setLineWidth(1);
        ctx.moveTo(chartLeft, chartBottom);
        ctx.lineTo(chartRight, chartBottom);
        ctx.moveTo(chartLeft, chartTop);
        ctx.lineTo(chartLeft, chartBottom);
        ctx.stroke();
        
        // 绘制折线图
        ctx.setStrokeStyle('#52c41a');
        ctx.setLineWidth(2);
        ctx.beginPath();
        
        for (var i = 0; i < monthData.length; i++) {
          var x = chartLeft + (i * (chartRight - chartLeft) / (monthData.length - 1));
          var y = chartBottom - (monthData[i] * chartHeight / maxValue);
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
        
        // 绘制数据点
        for (var i = 0; i < monthData.length; i++) {
          var x = chartLeft + (i * (chartRight - chartLeft) / (monthData.length - 1));
          var y = chartBottom - (monthData[i] * chartHeight / maxValue);
          
          ctx.setFillStyle('#52c41a');
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.setStrokeStyle('#fff');
          ctx.setLineWidth(1);
          ctx.stroke();
          
          if (monthData[i] > 0) {
            ctx.setFontSize(10);
            ctx.setFillStyle('#52c41a');
            ctx.setTextAlign('center');
            ctx.fillText(monthData[i].toString(), x, y - 8);
          }
        }
        
        // 绘制标签
        ctx.setFontSize(12);
        ctx.setFillStyle('#666');
        ctx.setTextAlign('center');
        
        for (var i = 0; i < months.length; i++) {
          var x = chartLeft + (i * (chartRight - chartLeft) / (months.length - 1));
          ctx.fillText(months[i], x, chartBottom + 15);
        }
        
        ctx.draw();
      } catch (error) {
        console.error('绘制月度对比图失败:', error);
      }
    },
    
    // 获取连续打卡历史
    getStreakHistory: function(checkins) {
      var dates = [];
      for (var i = 0; i < checkins.length; i++) {
        var dateStr = checkins[i].dateStr;
        if (dates.indexOf(dateStr) === -1) {
          dates.push(dateStr);
        }
      }
      
      dates.sort();
      
      var streaks = [];
      var currentStreakLength = 1;
      
      if (dates.length > 0) {
        for (var i = 1; i < dates.length; i++) {
          var prevDate = new Date(dates[i - 1]);
          var currDate = new Date(dates[i]);
          var diffDays = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
            currentStreakLength++;
          } else {
            if (currentStreakLength > 1) {
              streaks.push(currentStreakLength);
            }
            currentStreakLength = 1;
          }
        }
        
        if (currentStreakLength > 1) {
          streaks.push(currentStreakLength);
        }
      }
      
      streaks.sort(function(a, b) {
        return b - a;
      });
      
      return streaks.slice(0, 5);
    },
  
    // 月份变化
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
  
    // 时间范围变化
    onTimeRangeChange: function (e) {
      var range = e.currentTarget.dataset.range;
      this.setData({ timeRange: range });
      this.loadData();
    }
  });