# 서울 기온 MQTT 퍼블리셔

서울의 현재 기온을 AccuWeather에서 스크래핑해 MQTT 브로커로 발행하는 경량 모니터링 서비스입니다.

## 핵심 요약
- 실행: `npm install && npm start`
- 기본 브로커: `mqtt://test.mosquitto.org`, 토픽 `kiot/uniq-zenit/notebook/temp-sensor2`
- 주기: 실제 기온 60초마다 갱신, MQTT 발행 10초마다
- 메시지 필드: `temperature`, `baseTemperature`, `variation`, `timestamp`, `city`, `source`, `lastRealUpdate`
- 설정: 환경 변수 또는 `src/config/app.config.js` 한 곳에서 관리

---

## 시스템 개요
애플리케이션은 두 개의 주기를 병렬로 실행합니다. 첫 번째 작업은 AccuWeather 페이지를 파싱해 실제 기온을 갱신하고, 두 번째 작업은 지정된 변동 폭 안에서 온도를 조정해 MQTT 브로커로 전송합니다. MQTT 연결은 자동 재시도와 안전한 종료 처리를 포함합니다.

### 구성 요소
- `src/index.js`: 주기 관리와 MQTT 발행을 담당하는 `SeoulWeatherMonitor`
- `src/modules/seoulWebScrapWeather.js`: HTML 파싱 전략을 갖춘 `WeatherScraper`
- `src/modules/mqttPublisher.js`: 연결/발행/재연결을 담당하는 MQTT 래퍼
- `src/config/app.config.js`: 앱 설정과 환경 변수 변환기

## 설치 및 실행
```bash
npm install
npm start        # 또는 node src/index.js
```

종료 시 `Ctrl+C`를 누르면 모든 타이머와 MQTT 연결을 정리한 뒤 안전하게 종료합니다.

## 설정 방법
기본 설정은 `src/config/app.config.js`에 있으며, 아래 환경 변수로 덮어쓸 수 있습니다.

| 환경 변수 | 설명 | 기본값 |
| --- | --- | --- |
| `MQTT_BROKER_URL` | MQTT 브로커 URL | `mqtt://test.mosquitto.org` |
| `MQTT_TOPIC` | 발행 토픽 | `kiot/uniq-zenit/notebook/temp-sensor2` |
| `MQTT_CLIENT_ID` | 클라이언트 ID | 무작위 생성 |
| `MQTT_MAX_RECONNECT_ATTEMPTS` | 재연결 최대 시도 횟수 | `5` |
| `MQTT_PUBLISH_INTERVAL_MS` | MQTT 발행 주기(ms) | `10000` |
| `MQTT_PUBLISH_VARIATION_MIN` / `MAX` | 온도 변동 최소/최대 | `0.1` / `0.9` |
| `WEATHER_FETCH_INTERVAL_MS` | 실제 기온 조회 주기(ms) | `60000` |
| `WEATHER_URL` | 스크래핑 URL | AccuWeather 서울 페이지 |
| `WEATHER_DEFAULT_TEMPERATURE` | 파싱 실패 시 대체 온도 | `22.2` |

기타 헤더, 도시/소스 정보, 파싱 전략은 파일 안에서 바로 수정할 수 있습니다.

## 발행 메시지 예시
```jsonc
{
  "temperature": 22.7,
  "baseTemperature": 23.0,
  "variation": -0.3,
  "timestamp": "2024-01-01T12:00:00.000Z",
  "city": "Seoul",
  "source": "accuweather-web",
  "lastRealUpdate": "2024-01-01T11:59:00.000Z"
}
```

## 장애 대응 가이드
- **온도 파싱 실패**: `PARSING.TEMP_SELECTORS` 또는 `PARSING.TEMP_PATTERNS` 목록을 최신 DOM 구조에 맞게 업데이트합니다. 실패 시에는 `WEATHER_DEFAULT_TEMPERATURE`가 자동 사용됩니다.
- **MQTT 연결 실패**: 브로커 주소/계정 정보를 확인하고, 방화벽 또는 네트워크 설정을 점검합니다. `MAX_RECONNECT_ATTEMPTS`를 조정해 재시도 횟수를 늘릴 수 있습니다.

## 요구 사항
- Node.js 18 이상 (권장: 20.x)
- outbound 인터넷 연결 (AccuWeather 및 MQTT 브로커 접근용)

## 라이선스
ISC
