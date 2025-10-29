// Application Configuration
const coerceNumber = (name, fallback) => {
  const value = process.env[name];
  if (value === undefined || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const coerceString = (name, fallback) => {
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : value;
};

const createClientId = () => `seoul-weather-sensor-${Math.random().toString(16).slice(2)}`;

const APP_CONFIG = Object.freeze({
  MQTT: {
    BROKER_URL: coerceString('MQTT_BROKER_URL', 'mqtt://test.mosquitto.org'),
    BROKER_PORT: coerceNumber('MQTT_BROKER_PORT', 1883),
    TOPIC: coerceString('MQTT_TOPIC', 'kiot/uniq-zenit/notebook/temp-sensor2'),
    CLIENT_ID: coerceString('MQTT_CLIENT_ID', createClientId()),
    MAX_RECONNECT_ATTEMPTS: coerceNumber('MQTT_MAX_RECONNECT_ATTEMPTS', 5),
    CONNECTION_OPTIONS: {
      clean: true,
      connectTimeout: coerceNumber('MQTT_CONNECT_TIMEOUT_MS', 30000),
      username: coerceString('MQTT_USERNAME', ''),
      password: coerceString('MQTT_PASSWORD', ''),
      reconnectPeriod: coerceNumber('MQTT_RECONNECT_PERIOD_MS', 1000)
    }
  },

  WEATHER: {
    FETCH_INTERVAL_MS: coerceNumber('WEATHER_FETCH_INTERVAL_MS', 60000),
    CITY: coerceString('WEATHER_CITY', 'Seoul'),
    SOURCE: coerceString('WEATHER_SOURCE', 'accuweather-web'),
    URL: coerceString(
      'WEATHER_URL',
      'https://www.accuweather.com/en/kr/seoul/226081/weather-forecast/226081'
    ),
    DEFAULT_TEMPERATURE: coerceNumber('WEATHER_DEFAULT_TEMPERATURE', 22.2)
  },

  MQTT_PUBLISHING: {
    INTERVAL_MS: coerceNumber('MQTT_PUBLISH_INTERVAL_MS', 10000),
    TEMPERATURE_VARIATION: {
      MIN: coerceNumber('MQTT_PUBLISH_VARIATION_MIN', 0.1),
      MAX: coerceNumber('MQTT_PUBLISH_VARIATION_MAX', 0.9)
    }
  },

  HTTP: {
    USER_AGENT: coerceString(
      'HTTP_USER_AGENT',
      [
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        'AppleWebKit/537.36 (KHTML, like Gecko)',
        'Chrome/91.0.4472.124 Safari/537.36'
      ].join(' ')
    ),
    HEADERS: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      Connection: 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    }
  },

  PARSING: {
    MIN_TEMP: coerceNumber('PARSING_MIN_TEMP', -50),
    MAX_TEMP: coerceNumber('PARSING_MAX_TEMP', 60),
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
});

module.exports = APP_CONFIG;
