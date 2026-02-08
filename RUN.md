# How to Run ClassGrid

## 1. Install Node.js (LTS)

Install from [nodejs.org](https://nodejs.org). LTS version recommended.

## 2. Create MySQL database

In MySQL run:

```sql
CREATE DATABASE classgrid CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## 3. Configure `.env`

In the project root, edit `.env` and set your MySQL credentials:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=classgrid
```

## 4. Install and run

```bash
npm install
node server.js
```

## 5. Open the app

In your browser go to: **http://localhost:3000**

- First time: enter **name** and **semester** on the setup page, then click Continue.
- Then use **Dashboard**, **Edit Timetable**, **Mark Attendance**, and **Rules** as needed.

---

**One server, one run command.** No separate frontend or API.
