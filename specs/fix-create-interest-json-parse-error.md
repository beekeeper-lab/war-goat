# Bug: Failed to create new interest - JSON parse error

## Bug Description
When attempting to create a new interest through the UI, the operation fails with the error:
```
JSON.parse: unexpected character at line 1 column 1 of the JSON data
```

This error occurs because the frontend receives an HTML error page (`<!DOCTYPE html>...`) instead of a JSON response when making POST requests to create interests. The HTML response starts with `<`, which is not valid JSON, causing `JSON.parse()` to fail at the first character.

**Expected behavior:** Creating a new interest should succeed and return a JSON object containing the newly created interest item.

**Actual behavior:** The request fails with a JSON parse error because the server returns an HTML 404 error page instead of JSON.

## Problem Statement
The Vite development proxy is misconfigured. It strips the `/api` prefix from requests before forwarding them to the backend server, but the backend server mounts its JSON Server routes at `/api`. This mismatch causes:
- Frontend sends: `POST /api/interests`
- Vite proxy rewrites to: `POST /interests` (sent to localhost:3001)
- Backend expects: `POST /api/interests`
- Result: 404 error with HTML response "Cannot POST /interests"

## Solution Statement
Remove the path rewrite from the Vite proxy configuration. The backend already expects requests with the `/api` prefix, so the proxy should forward requests as-is without stripping the prefix.

## Steps to Reproduce
1. Start the development servers: `npm run dev:full`
2. Open http://localhost:3000 in a browser
3. Click the "Add Interest" button
4. Fill in a URL (e.g., "https://example.com")
5. Click "Add Interest" to submit
6. Observe the error: "Failed to add interest" with the JSON parse error in the console

Alternatively, via curl:
```bash
curl -s -X POST http://localhost:3000/api/interests \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","title":"Test","type":"other","status":"backlog","tags":[]}'
# Returns: <!DOCTYPE html>...<pre>Cannot POST /interests</pre>...
```

## Root Cause Analysis
The root cause is a configuration mismatch between the Vite proxy and the backend server:

1. **Backend server (`server/index.js`)** mounts json-server at `/api`:
   ```js
   app.use('/api', middlewares);
   app.use('/api', router);
   ```
   This means it expects requests like `POST /api/interests`.

2. **Vite proxy (`vite.config.ts`)** strips the `/api` prefix:
   ```js
   proxy: {
     '/api': {
       target: 'http://localhost:3001',
       changeOrigin: true,
       rewrite: (path) => path.replace(/^\/api/, ''),  // BUG: This strips /api
     },
   }
   ```
   This rewrites `POST /api/interests` to `POST /interests`.

3. **Result:** The backend receives `POST /interests` but has no route for it (its routes are under `/api`), returning a 404 HTML error page.

4. **Frontend impact:** The `api.ts` service calls `response.json()` on the HTML error response, which throws the JSON parse error.

## Relevant Files
Use these files to fix the bug:

- **`vite.config.ts`** - Contains the Vite proxy configuration with the erroneous path rewrite. This is the only file that needs to be modified to fix the bug.
- **`server/index.js`** - Backend server that mounts routes at `/api`. No changes needed, but referenced to confirm the expected request format.
- **`src/services/api.ts`** - Frontend API service that makes requests to `/api/interests`. No changes needed, but helpful for understanding the request flow.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Fix the Vite proxy configuration
- Open `vite.config.ts`
- Remove the `rewrite` function from the proxy configuration
- The proxy should forward `/api/*` requests to `http://localhost:3001/api/*` without modification

**Before:**
```js
proxy: {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, ''),
  },
}
```

**After:**
```js
proxy: {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true,
  },
}
```

### 2. Restart the development servers
- Kill any existing processes on ports 3000 and 3001
- Run `npm run dev:full` to restart both servers with the fixed configuration

### 3. Verify the fix via curl
- Test that POST requests now work correctly through the proxy:
  ```bash
  curl -s -X POST http://localhost:3000/api/interests \
    -H "Content-Type: application/json" \
    -d '{"url":"https://test-fix.com","title":"Test Fix","type":"other","status":"backlog","tags":[],"notes":"","createdAt":"2025-01-16T10:00:00Z","updatedAt":"2025-01-16T10:00:00Z"}'
  ```
- Confirm the response is valid JSON containing the created interest with an `id` field

### 4. Verify the fix in the UI
- Open http://localhost:3000 in a browser
- Click "Add Interest"
- Enter a test URL and submit
- Confirm the new interest appears in the list without errors

### 5. Run validation commands
- Execute all validation commands to ensure the fix works and introduces no regressions

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

- `curl -s -X POST http://localhost:3000/api/interests -H "Content-Type: application/json" -d '{"url":"https://validation-test.com","title":"Validation Test","type":"other","status":"backlog","tags":[],"notes":"","createdAt":"2025-01-16T10:00:00Z","updatedAt":"2025-01-16T10:00:00Z"}' | grep -q '"id"' && echo "PASS: POST creates interest" || echo "FAIL: POST failed"` - Verify POST returns valid JSON with an id
- `curl -s http://localhost:3000/api/interests | grep -q '"url"' && echo "PASS: GET works" || echo "FAIL: GET failed"` - Verify GET still works through the proxy
- `curl -s http://localhost:3000/api/health | grep -q '"status":"ok"' && echo "PASS: Health check works" || echo "FAIL: Health check failed"` - Verify the custom health endpoint still works

## Notes
- This is a one-line fix in `vite.config.ts` - simply remove the `rewrite` function
- The path rewrite was likely added incorrectly during initial setup, assuming the backend served routes at the root level
- The fix only affects the development environment proxy; production builds would need proper server configuration
- No changes are needed to the backend or frontend API code - they are already correctly configured
