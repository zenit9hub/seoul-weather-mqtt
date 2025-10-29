const { getSeoulTemperature } = require('./modules/seoulWebScrapWeather');
const MQTTPublisher = require('./modules/mqttPublisher');
const APP_CONFIG = require('./config/app.config');

class SeoulWeatherMonitor {
  constructor({
    config = APP_CONFIG,
    weatherProvider = () => getSeoulTemperature(),
    publisher = new MQTTPublisher({ config: APP_CONFIG.MQTT }),
    logger = console
  } = {}) {
    this.config = config;
    this.weatherProvider = weatherProvider;
    this.publisher = publisher;
    this.logger = logger;

    this.isRunning = false;
    this.tasks = [];
    this.shutdownHandlerRegistered = false;
    this.state = {
      baseTemperature: config.WEATHER.DEFAULT_TEMPERATURE,
      lastWeatherUpdate: null
    };
  }

  async start() {
    if (this.isRunning) {
      this.logger.log('애플리케이션이 이미 실행 중입니다.');
      return;
    }

    try {
      this.printStartupInfo();
      await this.publisher.connect();
      this.isRunning = true;
      this.scheduleTasks();
      this.setupGracefulShutdown();
      this.logger.log('서울 기온 모니터링이 시작되었습니다.');
    } catch (error) {
      this.logger.error('애플리케이션 시작 실패:', error.message);
      this.stop();
      throw error;
    }
  }

  printStartupInfo() {
    const { MQTT, WEATHER, MQTT_PUBLISHING } = this.config;
    this.logger.log('서울 기온 MQTT 퍼블리셔(웹스크래핑) 시작...');
    this.logger.log(`MQTT 토픽: ${MQTT.TOPIC}`);
    this.logger.log(`날씨 조회 간격: ${WEATHER.FETCH_INTERVAL_MS / 1000}초`);
    this.logger.log(`MQTT 발행 간격: ${MQTT_PUBLISHING.INTERVAL_MS / 1000}초`);
    this.logger.log(`데이터 소스: ${WEATHER.SOURCE}`);
  }

  scheduleTasks() {
    const { WEATHER, MQTT_PUBLISHING } = this.config;

    this.scheduleRecurringTask(
      () => this.updateRealTemperature(),
      WEATHER.FETCH_INTERVAL_MS,
      { immediate: true, label: '실제 온도 조회' }
    );

    this.scheduleRecurringTask(
      () => this.publishTemperatureWithVariation(),
      MQTT_PUBLISHING.INTERVAL_MS,
      { immediate: true, label: 'MQTT 발행' }
    );
  }

  scheduleRecurringTask(task, intervalMs, { immediate = false, label } = {}) {
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
      throw new Error(`유효하지 않은 주기 값: ${intervalMs}`);
    }

    const runTask = () => this.runSafely(task, label);
    if (immediate) {
      runTask();
    }

    const intervalId = setInterval(runTask, intervalMs);
    this.tasks.push(() => clearInterval(intervalId));
  }

  async runSafely(task, label = '작업') {
    try {
      await task();
    } catch (error) {
      this.logger.error(`[${label}] 실패: ${error.message}`);
    }
  }

  async updateRealTemperature() {
    const result = await this.weatherProvider();
    const temperature = this.ensureNumeric(result?.temperature, this.config.WEATHER.DEFAULT_TEMPERATURE);

    this.state.baseTemperature = temperature;
    this.state.lastWeatherUpdate = this.resolveTimestamp(result?.timestamp);

    this.logger.log(`실제 온도 업데이트: ${temperature}°C`);
  }

  async publishTemperatureWithVariation() {
    const { baseTemperature } = this.state;
    const { TEMPERATURE_VARIATION } = this.config.MQTT_PUBLISHING;
    const variation = this.generateTemperatureVariation(
      TEMPERATURE_VARIATION.MIN,
      TEMPERATURE_VARIATION.MAX
    );
    const adjustedTemperature = Number((baseTemperature + variation).toFixed(1));

    const payload = this.buildPublishPayload({
      temperature: adjustedTemperature,
      baseTemperature,
      variation
    });

    await this.publisher.publish(payload, {
      qos: 1,
      retain: false
    });
  }

  buildPublishPayload({ temperature, baseTemperature, variation }) {
    return {
      temperature,
      baseTemperature,
      variation,
      timestamp: new Date().toISOString(),
      city: this.config.WEATHER.CITY,
      source: this.config.WEATHER.SOURCE,
      lastRealUpdate: this.state.lastWeatherUpdate
        ? this.state.lastWeatherUpdate.toISOString()
        : null
    };
  }

  generateTemperatureVariation(min, max) {
    const safeMin = Number.isFinite(min) ? min : 0;
    const safeMax = Number.isFinite(max) ? max : safeMin;
    const [lower, upper] = safeMin <= safeMax ? [safeMin, safeMax] : [safeMax, safeMin];
    const range = upper - lower;
    const base = range === 0 ? lower : Math.random() * range + lower;
    const sign = Math.random() < 0.5 ? -1 : 1;

    return Number((base * sign).toFixed(1));
  }

  ensureNumeric(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  resolveTimestamp(timestamp) {
    if (!timestamp) {
      return new Date();
    }

    const parsed = new Date(timestamp);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  setupGracefulShutdown() {
    if (this.shutdownHandlerRegistered) {
      return;
    }

    const shutdown = (signal) => {
      this.logger.log(`\n${signal} 신호를 받았습니다. 애플리케이션을 종료합니다...`);
      this.stop();
      this.logger.log('애플리케이션이 안전하게 종료되었습니다.');
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    this.shutdownHandlerRegistered = true;
  }

  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    while (this.tasks.length > 0) {
      const cancel = this.tasks.pop();
      cancel();
    }

    try {
      this.publisher.disconnect();
    } catch (error) {
      this.logger.error('MQTT 연결 해제 중 오류:', error.message);
    }

    this.logger.log('애플리케이션이 중지되었습니다.');
  }
}

if (require.main === module) {
  const monitor = new SeoulWeatherMonitor();

  monitor.start().catch((error) => {
    console.error('애플리케이션 실행 실패:', error.message);
    process.exit(1);
  });
}

module.exports = SeoulWeatherMonitor;
