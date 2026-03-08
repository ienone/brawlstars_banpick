# PocketBase Setup

## 1. Download PocketBase
Download PocketBase from https://pocketbase.io/docs/ for your OS.

## 2. Start PocketBase
```bash
./pocketbase serve --http="127.0.0.1:8090"
```

## 3. Create Admin Account
Visit http://127.0.0.1:8090/_/ and create an admin account.

## 4. Import Collections
Use the Admin UI → Settings → Import Collections, and paste the contents of `pb_schema.json`.

## 5. Configure Frontend
Set `VITE_PB_URL=http://127.0.0.1:8090` in `frontend/.env` (optional, defaults to localhost:8090).

## 6. Authentication
Users self-register via the PocketBase `users` auth collection. Create initial users in Admin UI or enable public registration.
