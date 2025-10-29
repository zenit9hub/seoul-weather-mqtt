const axios = require('axios');
const cheerio = require('cheerio');
const APP_CONFIG = require('../config/app.config');

class WeatherScraper {
  constructor({ config = APP_CONFIG, httpClient = axios, parser = cheerio, logger = console } = {}) {
    this.config = config;
    this.httpClient = httpClient;
    this.parser = parser;
    this.logger = logger;
  }

  /**
   * AccuWeather에서 서울의 현재 기온을 스크래핑
   * @returns {Promise<Object>}
   */
  async getSeoulTemperature() {
    try {
      const { data: html } = await this.httpClient.get(this.config.WEATHER.URL, {
        headers: {
          'User-Agent': this.config.HTTP.USER_AGENT,
          ...this.config.HTTP.HEADERS
        }
      });

      const temperature = this.extractTemperature(html);

      return this.createPayload(temperature);
    } catch (error) {
      this.logger.error('웹 스크래핑으로 서울 기온 조회 실패:', error.message);
      return this.createPayload(this.config.WEATHER.DEFAULT_TEMPERATURE, {
        error: error.message,
        isDefault: true
      });
    }
  }

  extractTemperature(html) {
    const $ = this.parser.load(html);
    const strategies = [
      { name: 'CSS 선택자', handler: () => this.parseBySelectors($) },
      { name: '텍스트 패턴', handler: () => this.parseByPatterns($) },
      { name: 'JSON 데이터', handler: () => this.parseByJson($) }
    ];

    for (const { name, handler } of strategies) {
      const value = handler();
      if (typeof value === 'number' && this.isValidTemperature(value)) {
        this.logger.log(`온도 파싱 성공 (${name}): ${value}°C`);
        return value;
      }
    }

    this.logger.log(
      `온도 파싱 실패, 기본값 사용: ${this.config.WEATHER.DEFAULT_TEMPERATURE}°C`
    );
    return this.config.WEATHER.DEFAULT_TEMPERATURE;
  }

  parseBySelectors($) {
    for (const selector of this.config.PARSING.TEMP_SELECTORS) {
      const element = $(selector).first();
      if (!element.length) {
        continue;
      }

      const candidate = this.extractNumericValue(element.text());
      if (candidate !== null) {
        return candidate;
      }
    }

    return null;
  }

  parseByPatterns($) {
    const bodyText = $('body').text();

    for (const pattern of this.config.PARSING.TEMP_PATTERNS) {
      const matches = bodyText.match(pattern);
      if (!matches) {
        continue;
      }

      for (const raw of matches) {
        const candidate = this.extractNumericValue(raw);
        if (candidate !== null) {
          return candidate;
        }
      }
    }

    return null;
  }

  parseByJson($) {
    const scripts = $('script[type="application/ld+json"]');

    for (let i = 0; i < scripts.length; i += 1) {
      const raw = $(scripts[i]).html();
      if (!raw) {
        continue;
      }

      try {
        const jsonData = JSON.parse(raw);
        if (!jsonData) {
          continue;
        }

        const candidate = this.extractNumericValue(jsonData.temperature);
        if (candidate !== null) {
          return candidate;
        }
      } catch (error) {
        // JSON 파싱 실패는 무시
      }
    }

    return null;
  }

  extractNumericValue(value) {
    if (value === undefined || value === null) {
      return null;
    }

    const cleaned = String(value).replace(/[^\d.\-]/g, '');
    if (!cleaned) {
      return null;
    }

    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }

  isValidTemperature(value) {
    if (!Number.isFinite(value)) {
      return false;
    }

    const { MIN_TEMP, MAX_TEMP } = this.config.PARSING;
    return value >= MIN_TEMP && value <= MAX_TEMP;
  }

  createPayload(temperature, extra = {}) {
    return {
      temperature,
      timestamp: new Date().toISOString(),
      city: this.config.WEATHER.CITY,
      source: this.config.WEATHER.SOURCE,
      ...extra
    };
  }
}

const weatherScraper = new WeatherScraper();

module.exports = {
  getSeoulTemperature: () => weatherScraper.getSeoulTemperature(),
  WeatherScraper
};
