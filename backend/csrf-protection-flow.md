Frontend
   │
   │ GET /api/v1/csrf/token
   ▼
Backend
   │
   ├── Set CSRF cookie
   │
   └── Return CSRF token
           │
           ▼
Frontend stores token
           │
           ▼
POST /auth/register
X-CSRF-Token: <token>
           │
           ▼
      CSRF validation
           │
       ┌───┴───┐
       │       │
     valid   invalid
       │       │
       ▼       ▼
 Controller   403