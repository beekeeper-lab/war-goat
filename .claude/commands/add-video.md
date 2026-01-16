# Add YouTube Video with AI Enhancement

Add a YouTube video to War Goat with AI-powered summary and tagging.

## Usage

```
/add-video <youtube-url>
```

## What This Skill Does

1. **Fetch video metadata** - Title, author, thumbnail via oEmbed
2. **Fetch transcript** - Full transcript via MCP youtube-transcript server
3. **AI Analysis** - Claude analyzes the transcript to generate:
   - A concise summary (2-3 sentences)
   - Key topics/concepts covered
   - Suggested tags
   - Difficulty level (beginner/intermediate/advanced)
4. **Auto-categorize** - Assign categories based on content
5. **Save to database** - Create the interest item with all enriched data

## Steps

### Step 1: Extract Video ID and Fetch Metadata

First, let's get the video info. Use the YouTube oEmbed API:

```bash
# Extract video ID from the URL provided: $ARGUMENTS
# Then fetch metadata
```

### Step 2: Fetch Transcript via MCP

Use the youtube-search MCP server to fetch the transcript:

```
Call mcp__youtube-search__fetch_transcripts with the video URL or ID
```

### Step 3: Analyze with AI

Analyze the transcript and provide:

1. **Summary**: 2-3 sentence overview of the video content
2. **Key Topics**: List of main concepts/technologies discussed
3. **Suggested Tags**: 3-5 relevant tags for categorization
4. **Difficulty**: beginner, intermediate, or advanced
5. **Categories**: Which of these apply?
   - Programming
   - AI & Machine Learning
   - Web Development
   - DevOps
   - Architecture
   - Productivity
   - Business
   - Self Improvement

### Step 4: Save to Database

Create a new interest item by making a POST request to the API:

```bash
curl -X POST http://localhost:3001/api/interests \
  -H "Content-Type: application/json" \
  -d '{
    "url": "<video-url>",
    "type": "youtube",
    "title": "<title>",
    "description": "<ai-generated-summary>",
    "author": "<channel-name>",
    "thumbnail": "<thumbnail-url>",
    "status": "backlog",
    "tags": ["<ai-suggested-tags>"],
    "categories": ["<matched-categories>"],
    "hasTranscript": true,
    "notes": "Key topics: <topics>\nDifficulty: <level>",
    "createdAt": "<timestamp>",
    "updatedAt": "<timestamp>"
  }'
```

Then save the transcript:

```bash
curl -X PUT http://localhost:3001/api/transcripts/<item-id> \
  -H "Content-Type: application/json" \
  -d '{"transcript": "<full-transcript>"}'
```

### Step 5: Confirm

Output a summary of what was added:

```
Added: <title>
Author: <channel>
Summary: <ai-summary>
Tags: <tags>
Categories: <categories>
```

## Example

```
/add-video https://www.youtube.com/watch?v=dQw4w9WgXcQ
```
