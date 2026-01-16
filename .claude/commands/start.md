# Start Development Environment

Start (or restart) the Interest List development servers.

## Steps

### 1. Check if servers are already running

```bash
# Check for processes on ports 3000 (Vite) and 3001 (API)
lsof -ti:3000 2>/dev/null || echo "Port 3000 free"
lsof -ti:3001 2>/dev/null || echo "Port 3001 free"
```

### 2. Kill existing processes if running

```bash
# Kill any processes on port 3000 (Vite dev server)
lsof -ti:3000 | xargs -r kill -9 2>/dev/null || true

# Kill any processes on port 3001 (API server)
lsof -ti:3001 | xargs -r kill -9 2>/dev/null || true
```

### 3. Verify dependencies are installed

```bash
# Check if node_modules exists, install if not
[ -d "node_modules" ] || npm install
```

### 4. Start the development servers

```bash
npm run dev:full
```

## Notes
- **Frontend (Vite)**: http://localhost:3000
- **API Server**: http://localhost:3001
- The command runs in the foreground with both servers via concurrently
- Press Ctrl+C to stop both servers

## Troubleshooting

If ports are still busy after kill:
```bash
# Force kill with sudo if needed
sudo lsof -ti:3000 | xargs -r kill -9
sudo lsof -ti:3001 | xargs -r kill -9
```
