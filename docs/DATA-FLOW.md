# Data Flow & Enrichment

This document explains how data flows through War Goat, from user input to storage and display.

---

## Overview

War Goat processes data in three main flows:

1. **Enrichment Flow** - When adding a new item (YouTube URL → enriched data)
2. **CRUD Flow** - Standard create, read, update, delete operations
3. **Lazy Load Flow** - On-demand transcript loading

---

## Flow 1: Adding a YouTube Video (Enrichment)

This is the most complex flow, demonstrating MCP integration.

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER ACTION                                  │
│   Pastes: https://youtube.com/watch?v=J5B9UGTuNoM               │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                 FRONTEND: AddInterestModal                       │
│                                                                  │
│  1. handleUrlChange(url) triggered                              │
│  2. detectSourceType(url) → "youtube"                           │
│  3. setType("youtube")                                          │
│  4. isYouTubeUrl(url) → true                                    │
│  5. setEnrichStatus("loading")                                  │
│  6. Call enrichUrl(url)                                         │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│               FRONTEND: services/enrich.ts                       │
│                                                                  │
│  async enrichUrl(url) {                                         │
│    const response = await fetch('/api/enrich', {                │
│      method: 'POST',                                            │
│      body: JSON.stringify({ url })                              │
│    });                                                          │
│    return response.json();                                      │
│  }                                                              │
└─────────────────────────────────┬───────────────────────────────┘
                                  │ HTTP POST /api/enrich
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                  BACKEND: server/index.js                        │
│                                                                  │
│  app.post('/api/enrich', async (req, res) => {                  │
│    const { url } = req.body;                                    │
│    const videoId = extractYouTubeId(url);                       │
│                                                                  │
│    if (videoId) {                                               │
│      // Step A: Get metadata via oEmbed                         │
│      const metadata = await getYouTubeMetadata(url);            │
│                                                                  │
│      // Step B: Get transcript via MCP                          │
│      const transcript = await getYouTubeTranscript(url);        │
│                                                                  │
│      return res.json({ success: true, type: 'youtube', data }); │
│    }                                                            │
│  });                                                            │
└───────────┬─────────────────────────────┬───────────────────────┘
            │                             │
            ▼                             ▼
┌───────────────────────┐   ┌─────────────────────────────────────┐
│  YOUTUBE oEMBED API   │   │           MCP SERVER                │
│                       │   │                                     │
│  GET /oembed?url=...  │   │  docker run -i --rm                 │
│                       │   │    mcp/youtube-transcript           │
│  Returns:             │   │                                     │
│  - title              │   │  JSON-RPC Request:                  │
│  - author_name        │   │  {                                  │
│  - thumbnail_url      │   │    "method": "tools/call",          │
│                       │   │    "params": {                      │
│                       │   │      "name": "get_transcript",      │
│                       │   │      "arguments": { "url": "..." }  │
│                       │   │    }                                │
│                       │   │  }                                  │
│                       │   │                                     │
│                       │   │  Returns: transcript text           │
└───────────────────────┘   └─────────────────────────────────────┘
            │                             │
            └──────────────┬──────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              BACKEND: Combine & Return                           │
│                                                                  │
│  {                                                              │
│    success: true,                                               │
│    type: "youtube",                                             │
│    data: {                                                      │
│      url: "https://youtube.com/watch?v=...",                    │
│      type: "youtube",                                           │
│      title: "Video Title",                                      │
│      author: "Channel Name",                                    │
│      thumbnail: "https://i.ytimg.com/...",                      │
│      transcript: "Full transcript text..."                      │
│    }                                                            │
│  }                                                              │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                FRONTEND: Update UI State                         │
│                                                                  │
│  if (result.success) {                                          │
│    setTitle(result.data.title);          // Auto-fill form      │
│    setAuthor(result.data.author);                               │
│    setThumbnail(result.data.thumbnail);  // Show preview        │
│    setTranscript(result.data.transcript);                       │
│    setEnrichStatus("success");           // Show green badge    │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Flow 2: Submitting the Form (Create)

After enrichment, user clicks "Add Interest":

```
┌─────────────────────────────────────────────────────────────────┐
│                   USER CLICKS "Add Interest"                     │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│              FRONTEND: handleSubmit()                            │
│                                                                  │
│  const input = {                                                │
│    url, title, description, type,                               │
│    status: "backlog",                                           │
│    tags: ["tag1", "tag2"],                                      │
│    thumbnail, author, transcript                                │
│  };                                                             │
│                                                                  │
│  await onAdd(input);  // Calls hook                             │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│               FRONTEND: useInterests hook                        │
│                                                                  │
│  async addInterest(input) {                                     │
│    const newItem = await api.createInterest(input);             │
│    setInterests(prev => [newItem, ...prev]);  // Optimistic UI  │
│  }                                                              │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│              FRONTEND: services/api.ts                           │
│                                                                  │
│  async createInterest(input) {                                  │
│    // 1. Extract transcript (stored separately)                 │
│    const { transcript, ...restInput } = input;                  │
│                                                                  │
│    // 2. Auto-categorize based on content                       │
│    const categories = categorizeItem(restInput);                │
│                                                                  │
│    // 3. Prepare item for database                              │
│    const newItem = {                                            │
│      ...restInput,                                              │
│      categories,                                                │
│      hasTranscript: !!transcript,                               │
│      createdAt: new Date().toISOString(),                       │
│      updatedAt: new Date().toISOString()                        │
│    };                                                           │
│                                                                  │
│    // 4. Create in database                                     │
│    const created = await POST('/api/interests', newItem);       │
│                                                                  │
│    // 5. Save transcript separately                             │
│    if (transcript) {                                            │
│      await saveTranscript(created.id, transcript);              │
│    }                                                            │
│                                                                  │
│    return created;                                              │
│  }                                                              │
└────────────┬───────────────────────────────┬────────────────────┘
             │                               │
             ▼                               ▼
┌────────────────────────┐     ┌──────────────────────────────────┐
│     JSON SERVER        │     │     FILE SYSTEM                  │
│                        │     │                                  │
│  POST /api/interests   │     │  PUT /api/transcripts/:id        │
│                        │     │                                  │
│  db.json updated:      │     │  Creates file:                   │
│  {                     │     │  /data/transcripts/{id}.txt      │
│    "interests": [      │     │                                  │
│      { new item... }   │     │  Contains:                       │
│    ]                   │     │  Full transcript text            │
│  }                     │     │                                  │
└────────────────────────┘     └──────────────────────────────────┘
```

---

## Flow 3: Auto-Categorization

When creating an interest, content is automatically categorized:

```
┌─────────────────────────────────────────────────────────────────┐
│                    INPUT DATA                                    │
│                                                                  │
│  title: "Building AI Agents with Claude"                        │
│  author: "IndyDevDan"                                           │
│  tags: ["programming", "tutorial"]                              │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│             services/categorize.ts                               │
│                                                                  │
│  function categorizeItem(item) {                                │
│    // Combine all text fields                                   │
│    const text = [                                               │
│      item.title,                                                │
│      item.description,                                          │
│      item.author,                                               │
│      item.tags?.join(' ')                                       │
│    ].join(' ').toLowerCase();                                   │
│                                                                  │
│    // Check against category patterns                           │
│    const matches = [];                                          │
│                                                                  │
│    CATEGORIES.forEach(({ name, keywords }) => {                 │
│      if (keywords.some(kw => text.includes(kw))) {              │
│        matches.push(name);                                      │
│      }                                                          │
│    });                                                          │
│                                                                  │
│    return matches.length ? matches : ['Uncategorized'];         │
│  }                                                              │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CATEGORY PATTERNS                             │
│                                                                  │
│  Programming:       code, programming, typescript, python...    │
│  AI & ML:           ai, artificial intelligence, claude, gpt... │
│  Productivity:      productivity, habits, workflow, gtd...      │
│  Architecture:      architecture, microservices, system design. │
│  Self Improvement:  self-improvement, growth, mindset...        │
│  DevOps:            docker, kubernetes, ci/cd, terraform...     │
│  Web Development:   react, vue, angular, node, express...       │
│  Business:          startup, entrepreneur, marketing...         │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    OUTPUT                                        │
│                                                                  │
│  categories: ["Programming", "AI & Machine Learning"]           │
│                                                                  │
│  (Matched "ai" and "programming" keywords)                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Flow 4: Viewing an Item (Lazy Load Transcript)

Transcripts are only loaded when user expands the detail view:

```
┌─────────────────────────────────────────────────────────────────┐
│              USER CLICKS ITEM CARD                               │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│            FRONTEND: InterestDetail opens                        │
│                                                                  │
│  Shows item data from state (already loaded):                   │
│  - title, description, thumbnail                                │
│  - status, tags, categories                                     │
│  - notes                                                        │
│                                                                  │
│  Transcript section shows "collapsed"                           │
│  if item.hasTranscript === true                                 │
└─────────────────────────────────────────────────────────────────┘
                                  │
                        User clicks "Transcript" expander
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│            FRONTEND: Load transcript on-demand                   │
│                                                                  │
│  useEffect(() => {                                              │
│    if (transcriptExpanded && !transcript && hasTranscript) {    │
│      setTranscriptLoading(true);                                │
│      fetchTranscript(item.id)                                   │
│        .then(setTranscript)                                     │
│        .finally(() => setTranscriptLoading(false));             │
│    }                                                            │
│  }, [transcriptExpanded]);                                      │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                 BACKEND: GET /api/transcripts/:id                │
│                                                                  │
│  const filePath = `./data/transcripts/${id}.txt`;               │
│  const content = await fs.readFile(filePath, 'utf-8');          │
│  res.json({ id, transcript: content });                         │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│            FRONTEND: Display transcript                          │
│                                                                  │
│  {transcriptLoading ? (                                         │
│    <Loader2 className="animate-spin" />                         │
│  ) : transcript ? (                                             │
│    <p>{transcript}</p>                                          │
│  ) : (                                                          │
│    <p>Transcript not available</p>                              │
│  )}                                                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Flow 5: Status Cycling

Users can cycle through statuses by clicking the status badge:

```
┌─────────────────────────────────────────────────────────────────┐
│              USER CLICKS STATUS BADGE                            │
│                                                                  │
│  Current: "backlog"                                             │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│            FRONTEND: InterestCard.cycleStatus()                  │
│                                                                  │
│  const statuses = ['backlog', 'in-progress', 'completed'];      │
│  const currentIndex = statuses.indexOf(item.status);  // 0      │
│  const nextStatus = statuses[(currentIndex + 1) % 3]; // 'in-progress'
│                                                                  │
│  onStatusChange(item.id, nextStatus);                           │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│            FRONTEND: useInterests.updateStatus()                 │
│                                                                  │
│  // Optimistic update                                           │
│  setInterests(prev => prev.map(i =>                             │
│    i.id === id ? { ...i, status: newStatus } : i                │
│  ));                                                            │
│                                                                  │
│  // Persist to server                                           │
│  await api.updateInterest(id, { status: newStatus });           │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│            BACKEND: PATCH /api/interests/:id                     │
│                                                                  │
│  JSON Server updates db.json:                                   │
│  { "status": "in-progress", "updatedAt": "..." }                │
└─────────────────────────────────────────────────────────────────┘

Status Cycle:
  ┌──────────┐     ┌─────────────┐     ┌───────────┐
  │ backlog  │ ──► │ in-progress │ ──► │ completed │
  └──────────┘     └─────────────┘     └─────┬─────┘
       ▲                                     │
       └─────────────────────────────────────┘
```

---

## Data Storage Strategy

### Why Separate Transcript Storage?

```
┌─────────────────────────────────────────────────────────────────┐
│                     db.json                                      │
│                                                                  │
│  Small, fast-loading metadata:                                  │
│  - id, url, title, status                                       │
│  - tags, categories                                             │
│  - hasTranscript: true (flag only!)                             │
│                                                                  │
│  Loaded once on app start                                       │
│  ~1-5 KB per item                                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                /data/transcripts/                                │
│                                                                  │
│  Large transcript files:                                        │
│  - {id}.txt per item                                            │
│  - 10-100+ KB per transcript                                    │
│                                                                  │
│  Loaded only when user expands item                             │
│  Never loaded into main list                                    │
└─────────────────────────────────────────────────────────────────┘

Benefits:
✓ Fast initial page load (no transcripts)
✓ Filtering/searching stays fast
✓ Transcripts loaded on-demand
✓ Database stays small
```

---

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                  ERROR: MCP Server Fails                         │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│            BACKEND: getYouTubeTranscript()                       │
│                                                                  │
│  try {                                                          │
│    const transcript = await getMCPTranscript(url);              │
│    return transcript;                                           │
│  } catch (err) {                                                │
│    console.error('MCP error:', err.message);                    │
│    return null;  // Graceful degradation                        │
│  }                                                              │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│            BACKEND: Response with partial data                   │
│                                                                  │
│  {                                                              │
│    success: true,        // Still successful!                   │
│    type: "youtube",                                             │
│    data: {                                                      │
│      title: "Video Title",      // From oEmbed ✓                │
│      thumbnail: "...",          // From oEmbed ✓                │
│      transcript: null,          // Failed                       │
│      transcriptError: "MCP server exited with code 1"           │
│    }                                                            │
│  }                                                              │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│            FRONTEND: Show helpful message                        │
│                                                                  │
│  enrichStatus = "success"  (partial success)                    │
│  enrichMessage = "Video info loaded. Transcript: MCP error..."  │
│                                                                  │
│  User can still add the item without transcript                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Takeaways

1. **Enrichment is async** - UI shows loading state while fetching
2. **MCP runs on-demand** - Docker container spawns only when needed
3. **Data is split** - Metadata in JSON, transcripts in files
4. **Categorization is automatic** - Based on keyword matching
5. **Errors are graceful** - Partial data still useful
6. **Updates are optimistic** - UI updates before server confirms
