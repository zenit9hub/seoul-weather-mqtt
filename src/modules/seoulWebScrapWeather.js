const axios = require('axios');
const cheerio = require('cheerio');
const APP_CONFIG = require('../config/app.config');

class WeatherScraper {
  constructor() {
    this.config = APP_CONFIG;
  }

  /**
   * AccuWeather에서 서울의 현재 기온을 스크래핑
   * @returns {Promise<Object>} 온도 정보
   */
  async getSeoulTemperature() {
    try {
      const { data: html } = await axios.get(this.config.WEATHER.URL, {
        headers: {
          'User-Agent': this.config.HTTP.USER_AGENT,
          ...this.config.HTTP.HEADERS
        }
      });

      const $ = cheerio.load(html);
      const temperature = this.parseTemperature($);

      return {
        temperature,
        timestamp: new Date().toISOString(),
        city: this.config.WEATHER.CITY,
        source: this.config.WEATHER.SOURCE
      };
    } catch (error) {
      console.error('웹 스크래핑으로 서울 기온 조회 실패:', error.message);
      return {
        temperature: this.config.WEATHER.DEFAULT_TEMPERATURE, // 설정에서 기본값 사용
        timestamp: new Date().toISOString(),
        city: this.config.WEATHER.CITY,
        source: this.config.WEATHER.SOURCE,
        error: error.message,
        isDefault: true // 기본값 사용 여부 표시
      };
    }
  }

  /**
   * HTML에서 온도 파싱
   * @param {Object} $ - Cheerio 객체
   * @returns {number} 온도 값 (파싱 실패 시 기본값 반환)
   */
  parseTemperature($) {
    // 방법 1: CSS 선택자로 온도 파싱
    const temperature = this.parseBySelectors($);
    if (temperature !== null) {
      console.log(`온도 파싱 성공: ${temperature}°C (CSS 선택자)`);
      return temperature;
    }

    // 방법 2: 텍스트 패턴으로 온도 파싱
    const tempByPattern = this.parseByPatterns($);
    if (tempByPattern !== null) {
      console.log(`온도 패턴 매칭 성공: ${tempByPattern}°C`);
      return tempByPattern;
    }

    // 방법 3: JSON 데이터에서 온도 파싱
    const tempByJson = this.parseByJson($);
    if (tempByJson !== null) {
      console.log(`JSON 데이터에서 온도 파싱 성공: ${tempByJson}°C`);
      return tempByJson;
    }

    // 모든 파싱 방법 실패 시 기본값 반환
    console.log(`온도 파싱 실패, 기본값 사용: ${this.config.WEATHER.DEFAULT_TEMPERATURE}°C`);
    return this.config.WEATHER.DEFAULT_TEMPERATURE;
  }

  /**
   * CSS 선택자로 온도 파싱
   * @param {Object} $ - Cheerio 객체
   * @returns {number|null} 온도 값
   */
  parseBySelectors($) {
    for (const selector of this.config.PARSING.TEMP_SELECTORS) {
      const element = $(selector).first();
      if (element.length > 0) {
        const text = element.text().replace(/[^\d.\-]/g, '');
        const temp = parseFloat(text);
        if (this.isValidTemperature(temp)) {
          return temp;
        }
      }
    }
    return null;
  }

  /**
   * 텍스트 패턴으로 온도 파싱
   * @param {Object} $ - Cheerio 객체
   * @returns {number|null} 온도 값
   */
  parseByPatterns($) {
    const bodyText = $('body').text();
    
    for (const pattern of this.config.PARSING.TEMP_PATTERNS) {
      const matches = bodyText.match(pattern);
      if (matches && matches.length > 0) {
        const temp = parseFloat(matches[0].replace(/[^\d.\-]/g, ''));
        if (this.isValidTemperature(temp)) {
          return temp;
        }
      }
    }
    return null;
  }

  /**
   * JSON 데이터에서 온도 파싱
   * @param {Object} $ - Cheerio 객체
   * @returns {number|null} 온도 값
   */
  parseByJson($) {
    const scripts = $('script[type="application/ld+json"]');
    
    for (let i = 0; i < scripts.length; i++) {
      try {
        const jsonData = JSON.parse($(scripts[i]).html());
        if (jsonData && jsonData.temperature) {
          const temp = parseFloat(jsonData.temperature);
          if (this.isValidTemperature(temp)) {
            return temp;
          }
        }
      } catch (e) {
        // JSON 파싱 실패는 무시
      }
    }
    return null;
  }

  /**
   * 온도 값이 유효한지 확인
   * @param {number} temp - 온도 값
   * @returns {boolean} 유효성 여부
   */
  isValidTemperature(temp) {
    return temp && 
           temp >= this.config.PARSING.MIN_TEMP && 
           temp <= this.config.PARSING.MAX_TEMP;
  }
}

// 싱글톤 인스턴스 생성
const weatherScraper = new WeatherScraper();

module.exports = { 
  getSeoulTemperature: () => weatherScraper.getSeoulTemperature()
}; 