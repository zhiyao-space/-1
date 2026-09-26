#!/bin/bash
cd "$(dirname "$0")"

cd frontend && npm install --no-audit --no-fund && npm run dev
