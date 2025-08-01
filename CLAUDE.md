# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Seoul weather monitoring system that scrapes temperature data from AccuWeather and publishes it to an MQTT broker. The application uses a dual-interval system: fetching real temperature data every 60 seconds while publishing temperature variations to MQTT every 10 seconds, creating realistic temperature fluctuations for IoT simulation.

## Core Architecture

The application follows a modular architecture with clear separation of concerns:

- **Main Application** (`src/index.js`): `SeoulWeatherMonitor` class orchestrates the entire system, managing lifecycle, graceful shutdown, and coordinating between modules
- **Weather Scraping** (`src/modules/seoulWebScrapWeather.js`): `WeatherScraper` class handles web scraping from AccuWeather with multiple fallback parsing strategies (CSS selectors, regex patterns, JSON-LD)
- **MQTT Publishing** (`src/modules/mqttPublisher.js`): `MQTTPublisher` class manages MQTT connections, reconnection logic, and message publishing
- **Configuration** (`src/config/app.config.js`): Centralized configuration for all application settings including MQTT, scraping, HTTP headers, and parsing parameters

## Development Commands

```bash
# Install dependencies
npm install

# Start the application
npm start
# or
node src/index.js

# Development mode (same as start)
npm run dev
```

## Key Configuration Areas

All configuration is centralized in `src/config/app.config.js`:

- **MQTT Settings**: Broker URL, topic, client ID, connection options
- **Weather Monitoring**: Real temperature fetching interval (60s), target city, AccuWeather URL
- **MQTT Publishing**: Frequent publishing interval (10s) and temperature variation range (±0.1-0.9°C)
- **HTTP Configuration**: User-Agent strings and headers for web scraping
- **Temperature Parsing**: CSS selectors, regex patterns, and validation ranges for robust temperature extraction

## Data Flow

1. Application starts and connects to MQTT broker (`broker.emqx.io`)
2. **Weather Fetching Timer** (60s interval): Scrapes AccuWeather and stores real temperature in `recentTemperature`
3. **MQTT Publishing Timer** (10s interval): Generates temperature variation (±0.1-0.9°C) and publishes adjusted data
4. Weather scraper uses multi-strategy parsing (CSS selectors, regex, JSON-LD)
5. Enhanced JSON messages include both real and adjusted temperatures with metadata
6. Messages published to MQTT topic `kiot/zenit/notebook/temp-sensor`
7. Process continues with dual timers until graceful shutdown (SIGINT/SIGTERM)

## Error Handling Strategy

The application implements comprehensive error handling:
- **Web Scraping Failures**: Falls back to default temperature (22.2°C), but MQTT publishing continues with cached temperature
- **Temperature Caching**: Recent temperature persists between scraping failures, ensuring continuous MQTT publishing
- **MQTT Connection Issues**: Automatic reconnection with exponential backoff (max 5 attempts)
- **Graceful Shutdown**: Proper cleanup of both weather fetching and MQTT publishing intervals

## Parsing Robustness

Temperature extraction uses a three-tier fallback approach:
1. CSS selector matching against predefined selectors for AccuWeather elements
2. Regex pattern matching across page text for temperature values
3. JSON-LD structured data extraction from embedded scripts

This multi-strategy approach ensures continued operation even if AccuWeather changes their HTML structure.

## Message Format

Published MQTT messages follow this enhanced JSON structure:
```json
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

**Key Fields:**
- `temperature`: Final temperature with variation applied (published value)
- `baseTemperature`: Real temperature from AccuWeather scraping
- `variation`: Applied temperature change (±0.1-0.9°C)
- `lastRealUpdate`: Timestamp of last successful weather data fetch

## Dependencies

- `axios`: HTTP client for web scraping
- `cheerio`: Server-side HTML parsing and manipulation
- `mqtt`: MQTT client library for message publishing
- `systeminformation`: System information utilities (currently unused)
- `three`: 3D graphics library (currently unused - may be vestigial dependency)

## Key Implementation Details

- **Dual Timer System**: `weatherFetchIntervalId` (60s) and `mqttPublishIntervalId` (10s) run independently
- **Temperature Caching**: `recentTemperature` stores last successful scraping result for continuous publishing
- **Variation Generation**: `generateTemperatureVariation()` creates realistic ±0.1-0.9°C fluctuations
- **Enhanced Logging**: Separate logging for real temperature updates vs MQTT publishing events

## Testing

No test framework is currently configured. The package.json test script returns an error message indicating tests are not implemented.