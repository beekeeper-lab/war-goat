# Import Videos from YouTube Channel

Batch import recent videos from a YouTube channel into War Goat.

## Usage

```
/import-channel <channel-name-or-query> [count]
```

- `channel-name-or-query`: Channel name to search for
- `count`: Number of videos to import (default: 5, max: 10)

## What This Skill Does

1. **Search for channel** - Find the channel using YouTube Search MCP
2. **Get recent videos** - Fetch the channel's most recent videos
3. **Enrich each video** - Get metadata and transcripts
4. **AI categorization** - Categorize and tag each video
5. **Batch save** - Add all videos to the database

## Steps

### Step 1: Search for the Channel

Use the youtube-search MCP to find the channel:

```
Call mcp__youtube-search__search_channels with:
- query: $ARGUMENTS (channel name)
- max_results: 5
```

Present the results and confirm which channel to import from.

### Step 2: Search for Recent Videos

Use the youtube-search MCP to find videos:

```
Call mcp__youtube-search__search_videos with:
- query: "<channel name>"
- max_results: <count or 5>
- order: "date"
```

### Step 3: Process Each Video

For each video found:

1. **Get transcript** via MCP fetch_transcripts
2. **Analyze content** to determine:
   - Summary
   - Tags
   - Categories
   - Difficulty level
3. **Create interest item**

### Step 4: Save All Videos

For each video, make API calls to save:

```bash
# Create interest
curl -X POST http://localhost:3001/api/interests \
  -H "Content-Type: application/json" \
  -d '<interest-json>'

# Save transcript (if available)
curl -X PUT http://localhost:3001/api/transcripts/<id> \
  -H "Content-Type: application/json" \
  -d '{"transcript": "<transcript>"}'
```

### Step 5: Report Results

Output a summary table:

```
Imported X videos from <channel>:

| # | Title                          | Categories           | Tags        |
|---|--------------------------------|---------------------|-------------|
| 1 | Video Title 1                  | Programming, AI     | python, ml  |
| 2 | Video Title 2                  | Web Development     | react, ts   |
...

Successfully added X videos to War Goat!
```

## Examples

```
/import-channel Fireship 5
/import-channel "Andrej Karpathy" 3
/import-channel ThePrimeagen
```

## Notes

- Requires the youtube-search MCP server to be running
- Requires YouTube API key configured in the MCP server
- Transcripts may not be available for all videos
- Rate limits may apply for large batch imports
