# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Seoul weather monitoring system that scrapes temperature data from AccuWeather and publishes it to an MQTT broker. The application runs continuously, collecting temperature data every 60 seconds and publishing structured JSON messages to the configured MQTT topic.

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
- **Weather Monitoring**: Scraping interval (60s), target city, AccuWeather URL
- **HTTP Configuration**: User-Agent strings and headers for web scraping
- **Temperature Parsing**: CSS selectors, regex patterns, and validation ranges for robust temperature extraction

## Data Flow

1. Application starts and connects to MQTT broker (`broker.emqx.io`)
2. Timer triggers temperature collection every 60 seconds
3. Weather scraper fetches AccuWeather page and attempts parsing via multiple strategies
4. Parsed temperature data is packaged with timestamp, city, and source metadata
5. JSON message is published to MQTT topic `kiot/zenit/notebook/temp-sensor`
6. Process continues indefinitely until graceful shutdown (SIGINT/SIGTERM)

## Error Handling Strategy

The application implements comprehensive error handling:
- **Web Scraping Failures**: Falls back to default temperature (22.2°C) when parsing fails
- **MQTT Connection Issues**: Automatic reconnection with exponential backoff (max 5 attempts)
- **Graceful Shutdown**: Proper cleanup of intervals and MQTT connections on process signals

## Parsing Robustness

Temperature extraction uses a three-tier fallback approach:
1. CSS selector matching against predefined selectors for AccuWeather elements
2. Regex pattern matching across page text for temperature values
3. JSON-LD structured data extraction from embedded scripts

This multi-strategy approach ensures continued operation even if AccuWeather changes their HTML structure.

## Message Format

Published MQTT messages follow this JSON structure:
```json
{
  "temperature": 23,
  "timestamp": "2024-01-01T12:00:00.000Z",
  "city": "Seoul",
  "source": "accuweather-web",
  "error": "optional error message",
  "isDefault": true
}
```

## Dependencies

- `axios`: HTTP client for web scraping
- `cheerio`: Server-side HTML parsing and manipulation
- `mqtt`: MQTT client library for message publishing
- `systeminformation`: System information utilities (currently unused)
- `three`: 3D graphics library (currently unused - may be vestigial dependency)

## Testing

No test framework is currently configured. The package.json test script returns an error message indicating tests are not implemented.