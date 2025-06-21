// Application Configuration
const APP_CONFIG = {
  // MQTT Configuration
  MQTT: {
    BROKER_URL: 'mqtt://broker.emqx.io',
    BROKER_PORT: 1883,
    TOPIC: 'kiot/zenit/notebook/temp-sensor',
    CLIENT_ID: `seoul-weather-sensor-${Math.random().toString(16).slice(3)}`,
    CONNECTION_OPTIONS: {
      clean: true,
      connectTimeout: 4000,
      username: '',
      password: '',
      reconnectPeriod: 1000,
    }
  },

  // Weather Monitoring Configuration
  WEATHER: {
    INTERVAL_MS: 60000, // 1분 (60초)
    CITY: 'Seoul',
    SOURCE: 'accuweather-web',
    URL: 'https://www.accuweather.com/en/kr/seoul/226081/weather-forecast/226081',
    DEFAULT_TEMPERATURE: 22.2 // 파싱 실패 시 사용할 기본 온도값
  },

  // HTTP Request Configuration
  HTTP: {
    USER_AGENT: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    HEADERS: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    }
  },

  // Temperature Parsing Configuration
  PARSING: {
    MIN_TEMP: -50,
    MAX_TEMP: 60,
    TEMP_SELECTORS: [
      '.current-weather-card .temperature',
      '.current-weather .temp',
      '.current-weather .temperature',
      '.current-weather-card .temp',
      '.current-weather-info .temp',
      '.current-weather-info .temperature',
      '.current-weather .current-weather-card .temp',
      '.current-weather .current-weather-card .temperature',
      '[data-qa="curTemp"]',
      '.temp',
      '.temperature'
    ],
    TEMP_PATTERNS: [
      /(\d{1,2}(?:\.\d+)?)\s*°?C/g,
      /(\d{1,2}(?:\.\d+)?)\s*°?F/g,
      /(\d{1,2}(?:\.\d+)?)\s*degrees/g
    ]
  }
};

module.exports = APP_CONFIG; 