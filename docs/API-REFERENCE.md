# API Reference

This document describes all the REST API endpoints exposed by the War Goat backend server.

**Base URL**: `http://localhost:3001`

**Frontend Proxy**: The Vite dev server proxies `/api/*` requests from port 3000 to 3001.

---

## Endpoints Overview

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/enrich` | Enrich a URL with metadata |
| GET | `/api/interests` | List all interests |
| GET | `/api/interests/:id` | Get single interest |
| POST | `/api/interests` | Create new interest |
| PATCH | `/api/interests/:id` | Update interest |
| DELETE | `/api/interests/:id` | Delete interest |
| GET | `/api/transcripts/:id` | Get transcript text |
| PUT | `/api/transcripts/:id` | Save transcript text |
| GET | `/api/health` | Server health check |

---

## Enrichment API

### POST /api/enrich

Fetches metadata and transcript for a URL (currently optimized for YouTube).

**Request**:
```json
{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID"
}
```

**Response (YouTube success)**:
```json
{
  "success": true,
  "type": "youtube",
  "data": {
    "url": "https://www.youtube.com/watch?v=VIDEO_ID",
    "type": "youtube",
    "title": "Video Title Here",
    "author": "Channel Name",
    "channelName": "Channel Name",
    "thumbnail": "https://i.ytimg.com/vi/VIDEO_ID/hqdefault.jpg",
    "transcript": "Full transcript text...",
    "transcriptError": null
  }
}
```

**Response (YouTube with transcript error)**:
```json
{
  "success": true,
  "type": "youtube",
  "data": {
    "url": "https://www.youtube.com/watch?v=VIDEO_ID",
    "type": "youtube",
    "title": "Video Title Here",
    "author": "Channel Name",
    "channelName": "Channel Name",
    "thumbnail": "https://i.ytimg.com/vi/VIDEO_ID/hqdefault.jpg",
    "transcript": null,
    "transcriptError": "No transcript available for this video"
  }
}
```

**Response (Non-YouTube URL)**:
```json
{
  "success": true,
  "type": "other",
  "data": {
    "url": "https://example.com/article",
    "type": "article"
  }
}
```

**How It Works**:
1. Detects if URL is YouTube
2. For YouTube: Fetches oEmbed metadata + spawns MCP for transcript
3. For other URLs: Returns basic type detection only

---

## Interest CRUD API

These endpoints are powered by JSON Server operating on `db.json`.

### GET /api/interests

List all interests.

**Response**:
```json
[
  {
    "id": "abc123",
    "url": "https://youtube.com/watch?v=...",
    "type": "youtube",
    "title": "Video Title",
    "description": "Optional description",
    "status": "backlog",
    "tags": ["programming", "ai"],
    "categories": ["Programming", "AI & Machine Learning"],
    "thumbnail": "https://i.ytimg.com/...",
    "author": "Channel Name",
    "hasTranscript": true,
    "createdAt": "2026-01-16T10:00:00.000Z",
    "updatedAt": "2026-01-16T10:00:00.000Z"
  }
]
```

### GET /api/interests/:id

Get a single interest by ID.

**Response**: Same as single item from list above.

### POST /api/interests

Create a new interest.

**Request**:
```json
{
  "url": "https://youtube.com/watch?v=VIDEO_ID",
  "type": "youtube",
  "title": "Video Title",
  "description": "Optional description",
  "status": "backlog",
  "tags": ["tag1", "tag2"],
  "categories": ["Programming"],
  "thumbnail": "https://i.ytimg.com/...",
  "author": "Channel Name",
  "channelName": "Channel Name",
  "hasTranscript": true,
  "createdAt": "2026-01-16T10:00:00.000Z",
  "updatedAt": "2026-01-16T10:00:00.000Z"
}
```

**Response**: Created item with auto-generated `id`.

**Note**: The frontend's `api.ts` service adds:
- Auto-generated timestamps (`createdAt`, `updatedAt`)
- Auto-categorization based on content keywords
- Separate transcript storage via `/api/transcripts/:id`

### PATCH /api/interests/:id

Update an existing interest (partial update).

**Request** (only include fields to update):
```json
{
  "status": "completed",
  "notes": "Great video!",
  "tags": ["updated", "tags"]
}
```

**Response**: Updated item.

### DELETE /api/interests/:id

Delete an interest.

**Response**: Empty (204 No Content) or deleted item.

---

## Transcript API

Transcripts are stored as separate text files in `/data/transcripts/` for performance reasons.

### GET /api/transcripts/:id

Retrieve transcript text for an interest.

**Response (success)**:
```json
{
  "id": "abc123",
  "transcript": "Full transcript text here..."
}
```

**Response (not found)**:
```json
{
  "id": "abc123",
  "transcript": null
}
```

### PUT /api/transcripts/:id

Save or update transcript text.

**Request**:
```json
{
  "transcript": "Full transcript text to save..."
}
```

**Response**:
```json
{
  "id": "abc123",
  "success": true
}
```

**File Storage**: Saved to `/data/transcripts/{id}.txt`

---

## Health Check

### GET /api/health

Check if the server is running.

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2026-01-16T10:00:00.000Z"
}
```

---

## Data Types

### SourceType

```typescript
type SourceType =
  | 'youtube'
  | 'book'
  | 'audiobook'
  | 'article'
  | 'podcast'
  | 'github'
  | 'other';
```

### ItemStatus

```typescript
type ItemStatus =
  | 'backlog'      // Not started
  | 'in-progress'  // Currently working on
  | 'completed';   // Finished
```

### InterestItem (Full Schema)

```typescript
interface InterestItem {
  // Required fields
  id: string;
  url: string;
  type: SourceType;
  title: string;
  status: ItemStatus;
  tags: string[];
  createdAt: string;  // ISO 8601
  updatedAt: string;  // ISO 8601

  // Optional common fields
  description?: string;
  thumbnail?: string;
  author?: string;
  notes?: string;
  categories?: string[];

  // YouTube-specific
  channelName?: string;
  transcript?: string;       // Usually stored separately
  transcriptError?: string;
  hasTranscript?: boolean;   // Flag for lazy-loading
  duration?: string;

  // Book/Audiobook-specific
  isbn?: string;
  pageCount?: number;
  narrator?: string;

  // Article-specific
  siteName?: string;
  publishedDate?: string;

  // GitHub-specific
  stars?: number;
  language?: string;
}
```

---

## Error Handling

### Standard Error Response

```json
{
  "error": "Error message here",
  "status": 400
}
```

### Common Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (delete success) |
| 400 | Bad Request (invalid input) |
| 404 | Not Found |
| 500 | Server Error |

---

## Frontend API Client

The frontend uses `src/services/api.ts` to interact with these endpoints. Key functions:

```typescript
// Fetch all interests
async function fetchInterests(): Promise<InterestItem[]>

// Create new interest (handles transcript separately)
async function createInterest(input: EnrichedCreateInput): Promise<InterestItem>

// Update interest
async function updateInterest(id: string, input: UpdateInterestInput): Promise<InterestItem>

// Delete interest
async function deleteInterest(id: string): Promise<void>

// Fetch transcript on-demand
async function fetchTranscript(id: string): Promise<string | null>

// Save transcript
async function saveTranscript(id: string, transcript: string): Promise<void>
```

---

## Example: Complete Create Flow

```typescript
// 1. User enters YouTube URL in form
const url = "https://youtube.com/watch?v=J5B9UGTuNoM";

// 2. Frontend enriches the URL
const enrichResult = await fetch('/api/enrich', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url })
}).then(r => r.json());

// enrichResult = {
//   success: true,
//   type: 'youtube',
//   data: { title, author, thumbnail, transcript }
// }

// 3. User submits form, frontend creates interest
const interest = await fetch('/api/interests', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url,
    type: 'youtube',
    title: enrichResult.data.title,
    author: enrichResult.data.author,
    thumbnail: enrichResult.data.thumbnail,
    status: 'backlog',
    tags: [],
    categories: ['Programming'],  // Auto-generated
    hasTranscript: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })
}).then(r => r.json());

// 4. Save transcript separately
await fetch(`/api/transcripts/${interest.id}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ transcript: enrichResult.data.transcript })
});

// 5. Later, user expands item to view transcript
const transcriptData = await fetch(`/api/transcripts/${interest.id}`)
  .then(r => r.json());
// transcriptData = { id, transcript: "Full transcript text..." }
```
