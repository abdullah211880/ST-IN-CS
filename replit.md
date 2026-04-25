# MCP-Based RAG Question Answering System

## Overview

A full-stack intelligent document question answering system based on the Model Context Protocol (MCP) architecture with agent-oriented Retrieval-Augmented Generation (RAG). Users upload documents and ask natural language questions; specialized AI agents extract, index, and synthesize answers with full source citations and agent execution traces.

Based on: "Enhancing Document-Level Question Answering Using Model Context Protocol (MCP) and Agent-Oriented RAG Systems"

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/rag-qa)
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **AI**: OpenAI via Replit AI Integrations (gpt-5.2, gpt-5-mini)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Architecture

### MCP Engine (artifacts/api-server/src/lib/mcp-engine.ts)
The core orchestration engine implementing the Model Context Protocol pattern:
- **TextAgent**: Parses and chunks text documents
- **TopicModelingAgent**: Uses GPT to identify latent topic clusters (LDA-inspired)
- **RetrievalAgent**: Semantic search using cosine similarity over embeddings
- **AnswerSynthesisAgent**: GPT-5.2 answer generation with source citation

### Database Schema
- `documents` — uploaded documents with status, type, topics
- `chunks` — document chunks with embeddings and topic assignments
- `sessions` — MCP query sessions
- `rag_messages` — session messages with sources and agent traces
- `conversations` / `messages` — OpenAI integration tables

## Key Routes

- `GET/POST /api/documents` — document management
- `GET /api/documents/:id/chunks` — view document chunks
- `GET/POST /api/sessions` — session management
- `POST /api/sessions/:id/ask` — ask a question (core Q&A endpoint)
- `GET /api/stats/overview` — system statistics
- `GET /api/stats/topics` — topic distribution
- `GET /api/stats/recent-activity` — activity feed

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks
- `pnpm --filter @workspace/db run push` — push DB schema changes
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/rag-qa run dev` — run frontend locally

## Authentication
- **Clerk Auth** (v6) integrated for full sign-in / sign-up gate
- Google OAuth ("Continue with Google") + email one-time-code supported
- All app routes (`/overview`, `/documents`, `/sessions`, etc.) are protected — unauthenticated users are redirected to `/sign-in`
- Public routes: `/`, `/sign-in/*`, `/sign-up/*`
- After sign-in, users land on `/overview`. Sign-out returns to `/`
- Clerk proxy path: `/__clerk` (proxied through API server via `clerkProxyMiddleware.ts`)
- Env vars auto-set: `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`
- App ID: `app_3Cqnee3fPqt8ZR7eavYsgY1glb4`

## Use Cases Implemented
- Insurance policy analysis (exclusions, coverage terms)
- Financial document analysis (revenue, debt schedules)
- Legal contract review (indemnification clauses)
- Healthcare claim processing
