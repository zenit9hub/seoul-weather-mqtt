const { getSeoulTemperature } = require('./modules/seoulWebScrapWeather');
const MQTTPublisher = require('./modules/mqttPublisher');
const APP_CONFIG = require('./config/app.config');

class SeoulWeatherMonitor {
  constructor() {
    this.config = APP_CONFIG;
    this.mqttPublisher = new MQTTPublisher();
    this.isRunning = false;
    this.weatherFetchIntervalId = null;
    this.mqttPublishIntervalId = null;
    this.recentTemperature = this.config.WEATHER.DEFAULT_TEMPERATURE; // 최근 온도 저장
    this.lastWeatherUpdate = null;
  }

  /**
   * 애플리케이션 시작
   */
  async start() {
    try {
      this.printStartupInfo();
      await this.mqttPublisher.connect();
      this.startWeatherMonitoring();
      this.setupGracefulShutdown();
    } catch (error) {
      console.error('애플리케이션 시작 실패:', error.message);
      process.exit(1);
    }
  }

  /**
   * 시작 정보 출력
   */
  printStartupInfo() {
    console.log('서울 기온 MQTT 퍼블리셔(웹스크래핑) 시작...');
    console.log(`MQTT 토픽: ${this.config.MQTT.TOPIC}`);
    console.log(`날씨 조회 간격: ${this.config.WEATHER.FETCH_INTERVAL_MS / 1000}초`);
    console.log(`MQTT 발행 간격: ${this.config.MQTT_PUBLISHING.INTERVAL_MS / 1000}초`);
    console.log(`데이터 소스: ${this.config.WEATHER.SOURCE}`);
  }

  /**
   * 날씨 모니터링 시작
   */
  startWeatherMonitoring() {
    this.isRunning = true;
    
    // 실제 온도 데이터 가져오기 (큰 간격)
    this.fetchSeoulTemperature();
    this.weatherFetchIntervalId = setInterval(() => {
      this.fetchSeoulTemperature();
    }, this.config.WEATHER.FETCH_INTERVAL_MS);
    
    // MQTT 퍼블리싱 (작은 간격)
    this.publishTemperatureWithVariation();
    this.mqttPublishIntervalId = setInterval(() => {
      this.publishTemperatureWithVariation();
    }, this.config.MQTT_PUBLISHING.INTERVAL_MS);
    
    console.log('서울 기온 모니터링이 시작되었습니다.');
    console.log(`- 실제 온도 조회: ${this.config.WEATHER.FETCH_INTERVAL_MS / 1000}초마다`);
    console.log(`- MQTT 발행: ${this.config.MQTT_PUBLISHING.INTERVAL_MS / 1000}초마다`);
  }

  /**
   * 실제 서울 기온 가져오기 (큰 간격)
   */
  async fetchSeoulTemperature() {
    try {
      const weatherData = await getSeoulTemperature();
      this.recentTemperature = weatherData.temperature;
      this.lastWeatherUpdate = new Date();
      console.log(`실제 온도 업데이트: ${this.recentTemperature}°C`);
    } catch (error) {
      console.error('서울 기온 조회 실패:', error.message);
    }
  }

  /**
   * 온도 변화를 주어 MQTT 발행 (작은 간격)
   */
  async publishTemperatureWithVariation() {
    try {
      const variationConfig = this.config.MQTT_PUBLISHING.TEMPERATURE_VARIATION;
      const variation = this.generateTemperatureVariation(variationConfig.MIN, variationConfig.MAX);
      const adjustedTemperature = parseFloat((this.recentTemperature + variation).toFixed(1));
      
      const weatherData = {
        temperature: adjustedTemperature,
        baseTemperature: this.recentTemperature, // 실제 온도
        variation: variation,
        timestamp: new Date().toISOString(),
        city: this.config.WEATHER.CITY,
        source: this.config.WEATHER.SOURCE,
        lastRealUpdate: this.lastWeatherUpdate?.toISOString() || null
      };

      await this.mqttPublisher.publish(weatherData, {
        qos: 1,
        retain: false
      });
    } catch (error) {
      console.error('MQTT 발행 실패:', error.message);
    }
  }

  /**
   * 온도 변화값 생성 (±0.1 ~ 0.9도)
   */
  generateTemperatureVariation(min, max) {
    const range = max - min;
    const randomValue = Math.random() * range + min;
    const sign = Math.random() < 0.5 ? -1 : 1;
    return parseFloat((randomValue * sign).toFixed(1));
  }

  /**
   * 우아한 종료 설정
   */
  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`\n${signal} 신호를 받았습니다. 애플리케이션을 종료합니다...`);
      this.stop();
      console.log('애플리케이션이 안전하게 종료되었습니다.');
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  }

  /**
   * 애플리케이션 중지
   */
  stop() {
    this.isRunning = false;
    
    if (this.weatherFetchIntervalId) {
      clearInterval(this.weatherFetchIntervalId);
      this.weatherFetchIntervalId = null;
    }
    
    if (this.mqttPublishIntervalId) {
      clearInterval(this.mqttPublishIntervalId);
      this.mqttPublishIntervalId = null;
    }
    
    if (this.mqttPublisher) {
      this.mqttPublisher.disconnect();
    }
    
    console.log('애플리케이션이 중지되었습니다.');
  }
}

// 애플리케이션 실행
if (require.main === module) {
  const monitor = new SeoulWeatherMonitor();
  monitor.start().catch(error => {
    console.error('애플리케이션 실행 실패:', error.message);
    process.exit(1);
  });
}

module.exports = SeoulWeatherMonitor; 