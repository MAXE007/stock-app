# Stock Management System for Small Supermarkets

A full-stack stock management application designed for neighborhood supermarkets and small retail stores.

The system allows product management, stock movement tracking, and report generation for fiscal presentation purposes (ARCA / ex AFIP).

---

## 🏗 Architecture

- **Backend:** FastAPI
- **Frontend:** React + Vite
- **Database:** PostgreSQL
- **Containerization:** Docker & Docker Compose
- **Web Server:** Nginx (production build)

The entire stack is fully dockerized and can be started with a single command.

---

## 🚀 Running the project

```bash
docker compose up --build

Frontend:
http://localhost:5173

Backend:
http://localhost:8000/docs