# Backend

- Cares about correct, semantic HTTP status codes, not just NestJS defaults: POST handlers that don't create a resource (login, logout, refresh, email verification) should return 200, while genuinely resource-creating endpoints (registration) stay 201. Confidence: 0.6
