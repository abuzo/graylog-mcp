# graylog-mcp

> 🔍 Model Context Protocol (MCP) сервер для интеграции Graylog с AI-ассистентами

Минималистичный MCP сервер, предоставляющий инструменты для поиска логов в Graylog через stdio протокол. Работает с Cursor, Claude Desktop и другими MCP-клиентами.

## ✨ Особенности

- 🚀 Три мощных инструмента для поиска логов
- 🔒 Поддержка Personal Access Token (PAT) аутентификации
- 🌐 Работа с self-signed TLS сертификатами
- 📦 Простая установка через npm/npx
- 🎯 Автоматическая нормализация полей логов
- 🔍 Умный поиск по UUID/trace ID/request ID

## 📋 Требования

- Node.js >= 18
- Graylog сервер с настроенным Personal Access Token

## 📦 Установка

### Глобальная установка
```bash
npm i -g @alexbuzo/graylog-mcp
```

### Использование через npx (рекомендуется)
Не требует установки - см. раздел "Настройка в Cursor"

## 🚀 Быстрый старт

### Запуск вручную

```bash
graylog-mcp \
  --graylog-url https://graylog.example.com \
  --token YOUR_GRAYLOG_PAT \
  --ssl-verify=false
```

### Параметры командной строки

| Параметр | Обязательный | Описание | По умолчанию |
|----------|--------------|----------|--------------|
| `--graylog-url` | ✅ | URL вашего Graylog сервера | - |
| `--token` | ✅ | Personal Access Token | - |
| `--ssl-verify` | ❌ | Проверка SSL сертификата | `true` |
| `--debug` | ❌ | Режим отладки | `false` |

## 🔌 Настройка в Cursor

**Настройки → MCP Servers → Add custom server**

### Вариант 1: Через npx (рекомендуется)

```json
{
  "mcpServers": {
    "graylog": {
      "command": "npx",
      "args": [
        "-y",
        "@alexbuzo/graylog-mcp@latest",
        "--graylog-url", "https://graylog.example.com",
        "--token", "YOUR_GRAYLOG_PAT",
        "--ssl-verify", "false"
      ],
      "name": "Graylog Search"
    }
  }
}
```

### Вариант 2: С переменными окружения (безопаснее)

```json
{
  "mcpServers": {
    "graylog": {
      "command": "bash",
      "args": [
        "-lc",
        "npx -y @alexbuzo/graylog-mcp@latest --graylog-url \"$GRAYLOG_URL\" --token \"$GRAYLOG_TOKEN\" --ssl-verify=false"
      ],
      "env": {
        "GRAYLOG_URL": "https://graylog.example.com",
        "GRAYLOG_TOKEN": "YOUR_GRAYLOG_PAT"
      },
      "name": "Graylog (secure)"
    }
  }
}
```

### Вариант 3: Глобальная установка

```json
{
  "mcpServers": {
    "graylog": {
      "command": "graylog-mcp",
      "args": [
        "--graylog-url", "https://graylog.example.com",
        "--token", "YOUR_GRAYLOG_PAT",
        "--ssl-verify", "false"
      ],
      "name": "Graylog"
    }
  }
}
```

## 🛠 Доступные инструменты

### 1. `graylog.search_logs`
Поиск логов с использованием Lucene/GELF запросов.

**Параметры:**
- `query` (string, обязательный): Lucene/GELF запрос
- `rangeSec` (number, по умолчанию 3600): Временной диапазон в секундах
- `limit` (number, опционально): Максимальное количество результатов (макс. 500)
- `offset` (number, опционально): Смещение для пагинации
- `filter` (string, опционально): Дополнительный фильтр (например, `stream:<STREAM_ID>`)

**Пример запроса:**
```typescript
{
  query: "level:ERROR AND service:api",
  rangeSec: 3600,
  limit: 100,
  filter: "stream:507f1f77bcf86cd799439011"
}
```

### 2. `graylog.search_uuid`
Умный поиск по UUID, request ID, trace ID и другим идентификаторам. Автоматически проверяет множество распространенных полей.

**Параметры:**
- `uuid` (string, обязательный): UUID или идентификатор для поиска
- `rangeSec` (number, по умолчанию 86400): Временной диапазон в секундах (24 часа)
- `limit` (number, опционально): Максимальное количество результатов (макс. 500)

**Автоматически ищет в полях:**
- `request_id`, `requestId`, `req_id`
- `trace_id`, `traceId`, `trace.id`
- `span_id`, `spanId`, `span.id`
- `transaction_id`, `transactionId`
- `correlation_id`, `correlationId`
- `_id`

**Пример запроса:**
```typescript
{
  uuid: "550e8400-e29b-41d4-a716-446655440000",
  rangeSec: 86400,
  limit: 200
}
```

### 3. `graylog.search_stream`
Получение сообщений из конкретного потока (stream).

**Параметры:**
- `streamId` (string, обязательный): ID потока в Graylog
- `rangeSec` (number, по умолчанию 3600): Временной диапазон в секундах
- `limit` (number, опционально): Максимальное количество результатов (макс. 500)

**Пример запроса:**
```typescript
{
  streamId: "507f1f77bcf86cd799439011",
  rangeSec: 7200,
  limit: 150
}
```

## 📊 Формат ответа

Все инструменты возвращают нормализованный JSON со следующей структурой:

```json
{
  "total": 42,
  "messages": [
    {
      "id": "message_id",
      "ts": "2024-01-15T10:30:00.000Z",
      "level": "ERROR",
      "source": "api-server-01",
      "container": "api-service",
      "message": "Database connection failed",
      "short_message": "DB error",
      "http_method": "POST",
      "url": "/api/users",
      "status": 500,
      "latency_ms": 1234,
      "trace_id": "abc123",
      "span_id": "def456",
      "request_id": "req-789",
      "tenant_id": "tenant-001",
      "client_ip": "192.168.1.1",
      "user_agent": "Mozilla/5.0...",
      "service": "user-api",
      "request": {...},
      "response": {...}
    }
  ]
}
```

### Автоматическая нормализация полей

Сервер автоматически извлекает и нормализует следующие поля из различных форматов:

| Поле | Альтернативные имена |
|------|---------------------|
| `container` | `container_name`, `kubernetes.container_name` |
| `http_method` | `method`, `http_method`, `request_method` |
| `url` | `path`, `request_path` |
| `status` | `http_status`, `response_status` |
| `latency_ms` | `duration_ms`, `response_time_ms` |
| `trace_id` | `traceId`, `trace.id` |
| `span_id` | `spanId`, `span.id` |
| `request_id` | `req_id`, `requestId` |
| `client_ip` | `remote_addr`, `ip` |
| `service` | `service_name`, `app` |

## 💻 Локальная разработка

### Установка зависимостей
```bash
npm install
```

### Сборка проекта
```bash
npm run build
```

### Запуск в режиме разработки
```bash
npm run dev -- --graylog-url https://graylog.example.com --token YOUR_PAT --ssl-verify=false
```

### Тестирование собранной версии
```bash
node dist/cli.js --graylog-url https://graylog.example.com --token YOUR_PAT --ssl-verify=false --debug
```

## 🔧 Структура проекта

```
graylog-mcp/
├── src/
│   ├── cli.ts        # CLI интерфейс и точка входа
│   ├── server.ts     # MCP сервер и регистрация инструментов
│   └── graylog.ts    # API клиент для Graylog
├── dist/             # Скомпилированный код
├── package.json      # Метаданные и зависимости
└── tsconfig.json     # Конфигурация TypeScript
```

## 🔒 Безопасность

### Personal Access Token (PAT)

1. Создайте PAT в Graylog: **System → Users → [Your User] → Edit → Create Token**
2. Токен должен иметь права на чтение целевых потоков
3. Сервер автоматически пробует два формата авторизации:
   - `token:YOUR_PAT`
   - `YOUR_PAT:token`

### SSL/TLS

- **Production:** Используйте валидный CA сертификат и `--ssl-verify=true`
- **Development/Self-signed:** Используйте `--ssl-verify=false`
- **Альтернатива:** Установите `NODE_EXTRA_CA_CERTS` на путь к доверенному CA

### Рекомендации

- ✅ Используйте переменные окружения для токенов
- ✅ Не коммитьте токены в git
- ✅ Используйте минимально необходимые права для PAT
- ✅ Регулярно ротируйте токены

## 🐛 Устранение неполадок

### 401/403 ошибки
- Проверьте валидность PAT
- Убедитесь, что у токена есть права на чтение потоков
- Проверьте формат URL (должен включать протокол: `https://`)

### TLS/SSL ошибки
```bash
# Опция 1: Отключить проверку (не для production!)
--ssl-verify=false

# Опция 2: Указать CA сертификат
export NODE_EXTRA_CA_CERTS=/path/to/ca-cert.pem
```

### Нет результатов
- Попробуйте простой запрос: `query: "*"`
- Проверьте временной диапазон (увеличьте `rangeSec`)
- Убедитесь, что в выбранных потоках есть данные
- Проверьте синтаксис Lucene запроса

### Debug режим
Запустите с флагом `--debug` для диагностики:
```bash
graylog-mcp --graylog-url ... --token ... --debug
```

## 🤝 Примеры использования

### Пример 1: Поиск ошибок за последний час
```typescript
// Инструмент: graylog.search_logs
{
  query: "level:ERROR",
  rangeSec: 3600
}
```

### Пример 2: Поиск по trace ID
```typescript
// Инструмент: graylog.search_uuid
{
  uuid: "abc-123-def-456",
  rangeSec: 86400
}
```

### Пример 3: Получение логов конкретного сервиса
```typescript
// Инструмент: graylog.search_logs
{
  query: "service:auth-api AND level:WARN",
  rangeSec: 7200,
  limit: 50
}
```

### Пример 4: Поиск HTTP 5xx ошибок
```typescript
// Инструмент: graylog.search_logs
{
  query: "status:[500 TO 599]",
  rangeSec: 3600
}
```

## 📝 Примечания

- Сервер использует Graylog REST API через `/api/search/universal/relative` и `/api/streams/{id}/messages`
- Максимальное количество результатов на запрос: 500
- По умолчанию возвращается 150 записей
- Поддерживается пагинация через параметры `limit` и `offset`
- Все временные метки в UTC

## 🔗 Полезные ссылки

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Graylog API Documentation](https://go2docs.graylog.org/current/downloading_and_installing_graylog/rest_api.htm)
- [Lucene Query Syntax](https://lucene.apache.org/core/9_0_0/queryparser/org/apache/lucene/queryparser/classic/package-summary.html)

## 📄 Лицензия

MIT © Aliaksei Buzo

## 🙏 Вклад

Contributions приветствуются! Пожалуйста, создайте issue или pull request в [GitHub репозитории](https://github.com/abuzo/graylog-mcp).


