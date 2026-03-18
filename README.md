# 🦞 jobClaw

Local-first job discovery, AI-tailored LaTeX resumes, and application tracking.

## Features
- **Daily curated job lists** from Adzuna, Remotive, and The Muse APIs
- **AI-tailored resumes** (LaTeX → PDF) per job using OpenAI / Anthropic / Ollama
- **Application tracker** with Kanban board
- **Career profile** as single source of truth for all applications

## Quick Start

### Prerequisites
- Node.js 18+
- `brew install tectonic` (for LaTeX → PDF compilation)

### Setup
```bash
# Install all dependencies
npm install

# Copy and configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with your API keys

# Start both frontend and backend
npm run dev
```

Frontend: http://localhost:5173  
Backend API: http://localhost:3001

## Stack
- **Frontend**: React + Vite (TypeScript)
- **Backend**: Node.js + Express
- **Database**: SQLite (better-sqlite3)
- **AI**: Multi-provider (OpenAI / Anthropic / Ollama)
- **LaTeX → PDF**: tectonic
- **Job APIs**: Adzuna, Remotive, The Muse
