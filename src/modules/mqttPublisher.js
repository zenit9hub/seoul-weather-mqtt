const mqtt = require('mqtt');
const MQTT_CONFIG = require('../config/mqtt.config');

class MQTTPublisher {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  /**
   * MQTT 브로커에 연결
   * @returns {Promise<void>}
   */
  async connect() {
    return new Promise((resolve, reject) => {
      try {
        console.log(`MQTT 브로커에 연결 중: ${MQTT_CONFIG.BROKER_URL}`);
        
        this.client = mqtt.connect(MQTT_CONFIG.BROKER_URL, {
          ...MQTT_CONFIG.CONNECTION_OPTIONS,
          clientId: MQTT_CONFIG.CLIENT_ID
        });

        this.client.on('connect', () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          console.log('MQTT 브로커에 성공적으로 연결되었습니다.');
          resolve();
        });

        this.client.on('error', (error) => {
          console.error('MQTT 연결 오류:', error.message);
          this.isConnected = false;
          reject(error);
        });

        this.client.on('close', () => {
          console.log('MQTT 연결이 종료되었습니다.');
          this.isConnected = false;
        });

        this.client.on('reconnect', () => {
          this.reconnectAttempts++;
          console.log(`MQTT 재연결 시도 ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
          
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('최대 재연결 시도 횟수를 초과했습니다.');
            this.disconnect();
          }
        });

      } catch (error) {
        console.error('MQTT 클라이언트 생성 실패:', error.message);
        reject(error);
      }
    });
  }

  /**
   * 메시지 발행
   * @param {Object} data - 발행할 데이터
   * @param {Object} options - 발행 옵션
   * @returns {Promise<boolean>}
   */
  async publish(data, options = {}) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected || !this.client) {
        reject(new Error('MQTT 클라이언트가 연결되지 않았습니다.'));
        return;
      }

      try {
        const message = JSON.stringify(data);
        const publishOptions = {
          qos: options.qos || 1,
          retain: options.retain || false,
          ...options
        };

        this.client.publish(MQTT_CONFIG.TOPIC, message, publishOptions, (error) => {
          if (error) {
            console.error('메시지 발행 실패:', error.message);
            reject(error);
          } else {
            console.log(`메시지 발행 성공: ${MQTT_CONFIG.TOPIC}`);
            console.log(`발행된 데이터: ${message}`);
            resolve(true);
          }
        });

      } catch (error) {
        console.error('메시지 발행 중 오류:', error.message);
        reject(error);
      }
    });
  }

  /**
   * 연결 해제
   */
  disconnect() {
    if (this.client) {
      this.client.end();
      this.client = null;
      this.isConnected = false;
      console.log('MQTT 연결이 해제되었습니다.');
    }
  }

  /**
   * 연결 상태 확인
   * @returns {boolean}
   */
  isConnected() {
    return this.isConnected;
  }
}

module.exports = MQTTPublisher; 