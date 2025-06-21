const { getSeoulTemperature } = require('./modules/seoulWebScrapWeather');
const MQTTPublisher = require('./modules/mqttPublisher');
const APP_CONFIG = require('./config/app.config');

class SeoulWeatherMonitor {
  constructor() {
    this.config = APP_CONFIG;
    this.mqttPublisher = new MQTTPublisher();
    this.isRunning = false;
    this.intervalId = null;
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
    console.log(`측정 간격: ${this.config.WEATHER.INTERVAL_MS / 1000}초`);
    console.log(`데이터 소스: ${this.config.WEATHER.SOURCE}`);
  }

  /**
   * 날씨 모니터링 시작
   */
  startWeatherMonitoring() {
    this.isRunning = true;
    this.publishSeoulTemperature();
    this.intervalId = setInterval(() => {
      this.publishSeoulTemperature();
    }, this.config.WEATHER.INTERVAL_MS);
    console.log('서울 기온 모니터링이 시작되었습니다.');
  }

  /**
   * 서울 기온 발행
   */
  async publishSeoulTemperature() {
    try {
      const weatherData = await getSeoulTemperature();
      await this.mqttPublisher.publish(weatherData, {
        qos: 1,
        retain: false
      });
    } catch (error) {
      console.error('서울 기온 발행 실패:', error.message);
    }
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
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
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