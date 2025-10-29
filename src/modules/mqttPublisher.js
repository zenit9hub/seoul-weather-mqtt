const mqtt = require('mqtt');
const MQTT_CONFIG = require('../config/mqtt.config');

class MQTTPublisher {
  constructor({ config = MQTT_CONFIG, mqttConnector = mqtt.connect, logger = console } = {}) {
    this.config = config;
    this.mqttConnector = mqttConnector;
    this.logger = logger;
    this.client = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = config.MAX_RECONNECT_ATTEMPTS ?? 5;
  }

  /**
   * MQTT 브로커에 연결
   * @param {Object} options
   * @param {string} [options.brokerUrl]
   * @param {Object} [options.connectionOptions]
   * @returns {Promise<void>}
   */
  async connect({ brokerUrl, connectionOptions } = {}) {
    if (this.connected) {
      return;
    }

    if (this.client) {
      this.disconnect();
    }

    const targetUrl = brokerUrl || this.config.BROKER_URL;
    const mergedOptions = {
      ...this.config.CONNECTION_OPTIONS,
      ...connectionOptions
    };

    mergedOptions.clientId = mergedOptions.clientId || this.config.CLIENT_ID;

    this.logger.log(`MQTT 브로커에 연결 시도: ${targetUrl}`);

    await new Promise((resolve, reject) => {
      try {
        this.client = this.mqttConnector(targetUrl, mergedOptions);
      } catch (error) {
        reject(error);
        return;
      }

      const handleConnect = () => {
        this.connected = true;
        this.reconnectAttempts = 0;
        this.logger.log('MQTT 브로커 연결 성공');
        resolve();
      };

      const handleError = (error) => {
        this.logger.error('MQTT 연결 오류:', error.message);
        this.connected = false;
        this.teardownClient();
        reject(error);
      };

      const handleClose = () => {
        this.logger.log('MQTT 연결 종료');
        this.connected = false;
      };

      const handleReconnect = () => {
        this.reconnectAttempts += 1;
        this.logger.log(
          `MQTT 재연결 시도 ${this.reconnectAttempts}/${this.maxReconnectAttempts}`
        );

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          this.logger.error('최대 재연결 시도 횟수를 초과했습니다.');
          this.disconnect();
        }
      };

      this.client.on('connect', handleConnect);
      this.client.on('error', handleError);
      this.client.on('close', handleClose);
      this.client.on('reconnect', handleReconnect);
    });
  }

  /**
   * 메시지 발행
   * @param {Object} payload
   * @param {Object} options
   * @param {string} [options.topic]
   * @param {number} [options.qos]
   * @param {boolean} [options.retain]
   * @returns {Promise<boolean>}
   */
  async publish(payload, options = {}) {
    if (!this.connected || !this.client) {
      throw new Error('MQTT 클라이언트가 연결되지 않았습니다.');
    }

    const { topic = this.config.TOPIC, qos = 1, retain = false, ...rest } = options;
    const message = JSON.stringify(payload);

    return new Promise((resolve, reject) => {
      this.client.publish(
        topic,
        message,
        { qos, retain, ...rest },
        (error) => {
          if (error) {
            this.logger.error('메시지 발행 실패:', error.message);
            reject(error);
            return;
          }

          this.logger.log(`메시지 발행 성공: ${topic}`);
          this.logger.log(`발행된 데이터: ${message}`);
          resolve(true);
        }
      );
    });
  }

  /**
   * 연결 해제
   */
  disconnect() {
    if (!this.client) {
      return;
    }

    this.client.end(true, {}, () => {
      this.logger.log('MQTT 연결이 해제되었습니다.');
    });

    this.teardownClient();
    this.connected = false;
  }

  /**
   * 연결 상태 반환
   * @returns {boolean}
   */
  isConnected() {
    return this.connected;
  }

  teardownClient() {
    if (!this.client) {
      return;
    }

    this.client.removeAllListeners();
    this.client = null;
  }
}

module.exports = MQTTPublisher;
