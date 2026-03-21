# SEC Financial Portal

Smart Financial & Document Management Portal for Sian Soon Enterprise Company & Sian Soon Manufacturing Sdn Bhd.

---

## Deployment Guide (AWS Lightsail)

### Prerequisites

Before deploying, create these on AWS:

1. **Lightsail Instance** — Ubuntu 22.04, at least 1GB RAM
2. **RDS PostgreSQL** — Create a PostgreSQL database instance
3. **S3 Bucket** — Create a bucket for document storage
4. **Anthropic API Key** — Get from https://console.anthropic.com

---

### Step 1: Deploy the Code

SSH into your Lightsail instance and run:

```bash
git clone https://github.com/lawin1207/sec-financialportal.git /home/ubuntu/financial-portal && cd /home/ubuntu/financial-portal && bash deploy.sh
```

---

### Step 2: Configure Environment Variables

Open the `.env` file:

```bash
nano /home/ubuntu/financial-portal/server/.env
```

You will see:

```
# Server
PORT=3001
NODE_ENV=development

# Database (PostgreSQL)
DATABASE_URL=postgresql://postgres:password@localhost:5432/financial_portal

# JWT
JWT_SECRET=dev-secret-change-in-production-abc123xyz
JWT_EXPIRES_IN=8h

# AWS S3
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET_NAME=financial-portal-docs

# Anthropic (Claude API)
ANTHROPIC_API_KEY=your-anthropic-api-key
```

**Change the following values:**

| Variable | What to put | Where to find it |
|---|---|---|
| `NODE_ENV` | Change to `production` | — |
| `DATABASE_URL` | `postgresql://USERNAME:PASSWORD@YOUR-RDS-ENDPOINT:5432/financial_portal` | AWS RDS Console → Your instance → Endpoint |
| `JWT_SECRET` | A long random string (e.g. `mysecretkey2026!@#$%abcxyz`) | Generate your own |
| `AWS_REGION` | Your S3 bucket region (e.g. `ap-southeast-1`) | AWS S3 Console |
| `AWS_ACCESS_KEY_ID` | Your IAM access key | AWS IAM Console → Security Credentials |
| `AWS_SECRET_ACCESS_KEY` | Your IAM secret key | AWS IAM Console → Security Credentials |
| `S3_BUCKET_NAME` | Your S3 bucket name | AWS S3 Console |
| `ANTHROPIC_API_KEY` | Your API key starting with `sk-ant-` | https://console.anthropic.com → API Keys |

Save and exit: Press `Ctrl + X`, then `Y`, then `Enter`.

---

### Step 3: Configure User Credentials

Open the user seed file:

```bash
nano /home/ubuntu/financial-portal/server/src/migrations/002_seed_users.js
```

You will see:

```js
const users = [
  { username: 'win', displayName: 'Win', role: 'owner', password: 'Win@2026!' },
  { username: 'sarah', displayName: 'Sarah', role: 'admin', password: 'Sarah@2026!' },
  { username: 'yunxin', displayName: 'YunXin', role: 'accountant', password: 'YunXin@2026!' },
];
```

**Change the passwords** (and usernames/display names if needed):

```js
const users = [
  { username: 'win', displayName: 'Win', role: 'owner', password: 'YOUR_NEW_PASSWORD' },
  { username: 'sarah', displayName: 'Sarah', role: 'admin', password: 'YOUR_NEW_PASSWORD' },
  { username: 'yunxin', displayName: 'YunXin', role: 'accountant', password: 'YOUR_NEW_PASSWORD' },
];
```

Save and exit: Press `Ctrl + X`, then `Y`, then `Enter`.

---

### Step 4: Create Database Tables and Users

Run the migration and seed scripts:

```bash
cd /home/ubuntu/financial-portal/server
node src/migrations/run.js
node src/migrations/002_seed_users.js
```

---

### Step 5: Restart the Server

```bash
pm2 restart financial-portal
```

Your portal is now live at `http://YOUR_LIGHTSAIL_IP`.

---

## Updating the Portal

To deploy updates after code changes:

```bash
cd /home/ubuntu/financial-portal && git pull && bash deploy.sh
```

---

## User Roles

| User | Role | Access |
|---|---|---|
| Win | Owner | Full access — all features, reports, audit log, cash flow |
| Sarah | Admin | Upload PO/DO/Invoice, manage matches, view reports |
| YunXin | Accountant | View-only access to documents and reports |

---

## Architecture

```
Browser → Nginx (port 80) → React Frontend (static files)
                           → /api/* → Node.js Backend (port 3001) → PostgreSQL (RDS)
                                                                   → S3 (file storage)
                                                                   → Claude API (AI processing)
```
