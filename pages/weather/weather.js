// pages/weather/weather.js
Page({
    data: {
      // 搜索相关
      cityName: '',
      hasSearched: false,
      loading: false,
      errorMsg: '',
      
      // 当前天气数据
      currentWeather: null,
      
      // 常用城市
      commonCities: ['北京', '上海', '广州', '深圳', '杭州', '成都', '南京', '武汉']
    },
  
    onLoad: function() {
      // 页面加载
    },
  
    // 输入城市名称
    onCityInput: function(e) {
      this.setData({
        cityName: e.detail.value.trim(),
        errorMsg: ''
      });
    },
  
    // 点击搜索按钮
    searchWeather: function() {
      const cityName = this.data.cityName;
      
      if (!cityName) {
        wx.showToast({
          title: '请输入城市名称',
          icon: 'none'
        });
        return;
      }
      
      this.setData({
        loading: true,
        hasSearched: true
      });
      
      this.fetchWeatherData(cityName);
    },
  
    // 点击常用城市
    selectCommonCity: function(e) {
      const city = e.currentTarget.dataset.city;
      this.setData({
        cityName: city
      }, () => {
        this.searchWeather();
      });
    },
  
    // 调用天气API
    fetchWeatherData: function(cityName) {
      wx.showLoading({
        title: '加载中...',
        mask: true
      });
      
      // 使用易客天气API
      wx.request({
        url: 'https://v1.yiketianqi.com/free/day', // 今日天气接口
        method: 'GET',
        data: {
          appid: '57267117',      // 你的appid
          appsecret: 'sNr75DyK',  // 你的appsecret
          city: cityName,
          unescape: 1
        },
        success: (res) => {
          wx.hideLoading();
          
          if (res.statusCode === 200 && res.data && res.data.city) {
            this.setData({
              currentWeather: res.data,
              loading: false,
              errorMsg: ''
            });
          } else {
            this.setData({
              loading: false,
              errorMsg: '未找到该城市天气信息'
            });
            wx.showToast({
              title: '城市不存在',
              icon: 'error'
            });
          }
        },
        fail: (err) => {
          wx.hideLoading();
          this.setData({
            loading: false,
            errorMsg: '网络请求失败'
          });
          wx.showToast({
            title: '网络异常',
            icon: 'none'
          });
        }
      });
    },
  
    // 获取天气图标
    getWeatherIcon: function(weather) {
      const iconMap = {
        '晴': '☀️',
        '多云': '⛅',
        '阴': '☁️',
        '小雨': '🌧️',
        '中雨': '🌧️',
        '大雨': '🌧️',
        '暴雨': '⛈️',
        '雷阵雨': '⛈️',
        '阵雨': '🌦️',
        '小雪': '🌨️',
        '中雪': '❄️',
        '大雪': '❄️',
        '雾': '🌫️',
        '霾': '😷'
      };
      return iconMap[weather] || '⛅';
    },
  
    // 获取温度范围提示
    getTempTips: function(temp) {
      const temperature = parseInt(temp) || 0;
      if (temperature > 30) return '天气炎热，注意防暑';
      if (temperature > 25) return '温度舒适，适合外出';
      if (temperature > 15) return '温度适中，注意增减衣物';
      if (temperature > 5) return '天气较凉，注意保暖';
      return '天气寒冷，请注意防寒';
    },
  
    // 获取天气建议
    getWeatherTips: function(weather) {
      if (weather.includes('雨')) return '有降雨，请携带雨具';
      if (weather.includes('雪')) return '有降雪，请注意防滑';
      if (weather.includes('雷')) return '有雷雨，请避免户外活动';
      if (weather.includes('雾') || weather.includes('霾')) return '能见度低，注意交通安全';
      return '天气良好，适合户外活动';
    }
  });