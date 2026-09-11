---
title: Akwaaba Homes Backend API
emoji: 🏡
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
---

# Akwaaba Homes Backend API

REST API & Real-time WebSocket Service for Akwaaba Homes property management system.

## Environment Variables Configuration

Configure the following secrets in **Settings -> Variables and secrets**:

| Variable | Description |
| :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string (e.g. from Neon or Supabase) |
| `JWT_SECRET` | 32+ character high-entropy secret string |
| `REFRESH_JWT_SECRET` | (Optional) Fallback uses `JWT_SECRET` |
| `FRONTEND_URL` | URL of the frontend (e.g. `https://akwaaba-homes.vercel.app`) |
| `NODE_ENV` | `production` |
| `PORT` | `7860` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name for media uploads |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `PAYSTACK_SECRET_KEY` | Paystack secret key for payments |
