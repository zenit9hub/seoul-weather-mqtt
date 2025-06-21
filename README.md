# 서울 기온 MQTT 퍼블리셔

AccuWeather에서 서울의 현재 기온을 웹 스크래핑하여 MQTT 브로커로 발행하는 모니터링 시스템입니다.

## 기능

- 서울 현재 기온 실시간 모니터링 (AccuWeather 웹 스크래핑)
- MQTT 브로커로 온도 데이터 발행
- 자동 재연결 및 에러 처리
- 우아한 종료 처리
- 중앙화된 설정 관리

## MQTT 설정

- **브로커**: `broker.emqx.io`
- **토픽**: `kiot/zenit/notebook/temp-sensor`
- **포트**: 1883 (기본 MQTT 포트)
- **측정 간격**: 1분 (60초)

## 설치 및 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 애플리케이션 실행

```bash
npm start
```

또는

```bash
node src/index.js
```

## 프로젝트 구조

```
seoul-weather-mqtt/
├── src/
│   ├── config/
│   │   ├── app.config.js        # 애플리케이션 설정 (중앙 관리)
│   │   └── mqtt.config.js       # MQTT 설정
│   ├── modules/
│   │   ├── seoulWebScrapWeather.js # 웹 스크래핑 모듈
│   │   └── mqttPublisher.js     # MQTT 발행 모듈
│   └── index.js                 # 메인 애플리케이션
├── package.json
└── README.md
```

## 설정 변경

모든 설정은 `src/config/app.config.js` 파일에서 중앙 관리됩니다:

### 측정 간격 변경
```javascript
WEATHER: {
  INTERVAL_MS: 60000, // 1분 (60초)
  // ...
}
```

### MQTT 토픽 변경
```javascript
MQTT: {
  TOPIC: 'kiot/zenit/notebook/temp-sensor',
  // ...
}
```

### 데이터 소스 변경
```javascript
WEATHER: {
  SOURCE: 'accuweather-web',
  URL: 'https://www.accuweather.com/en/kr/seoul/226081/weather-forecast/226081'
  // ...
}
```

### 기본 온도값 변경
```javascript
WEATHER: {
  DEFAULT_TEMPERATURE: 22.2, // 파싱 실패 시 사용할 기본 온도값
  // ...
}
```

## 발행되는 메시지 형식

```json
{
  "temperature": 23,
  "timestamp": "2024-01-01T12:00:00.000Z",
  "city": "Seoul",
  "source": "accuweather-web"
}
```

## 종료

애플리케이션을 종료하려면 `Ctrl+C`를 누르세요. 애플리케이션이 안전하게 종료됩니다.

## 요구사항

- Node.js 14.0 이상
- 인터넷 연결 (AccuWeather 웹사이트 접근 및 MQTT 브로커 연결용)

## 문제 해결

### 온도 읽기 실패

- AccuWeather 웹사이트 구조 변경 시 `src/config/app.config.js`의 `PARSING.TEMP_SELECTORS`를 업데이트
- 네트워크 연결 상태 확인
- 파싱 실패 시 기본값(22.2°C)이 자동으로 사용됩니다

### MQTT 연결 실패

- 인터넷 연결을 확인하세요
- 방화벽 설정을 확인하세요
- 브로커 URL이 올바른지 확인하세요

## 라이선스

ISC