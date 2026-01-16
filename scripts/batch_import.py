#!/usr/bin/env python3
"""
Batch Import Script for War Goat

This script demonstrates why Python is often preferred for:
- Data processing and transformation
- Working with AI/ML libraries
- Complex MCP operations
- Batch operations with progress tracking

Usage:
    python scripts/batch_import.py --channel "Fireship" --count 5
    python scripts/batch_import.py --urls urls.txt
    python scripts/batch_import.py --help

Requirements:
    pip install requests youtube-transcript-api rich
"""

import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional

try:
    import requests
    from rich.console import Console
    from rich.progress import Progress, SpinnerColumn, TextColumn
    from rich.table import Table
except ImportError:
    print("Missing dependencies. Install with:")
    print("  pip install requests rich")
    sys.exit(1)

# Optional: youtube-transcript-api for direct transcript fetching
try:
    from youtube_transcript_api import YouTubeTranscriptApi
    HAS_TRANSCRIPT_API = True
except ImportError:
    HAS_TRANSCRIPT_API = False
    print("Note: youtube-transcript-api not installed. Transcripts will be skipped.")
    print("      Install with: pip install youtube-transcript-api")

console = Console()
API_BASE = "http://localhost:3001/api"


def extract_video_id(url: str) -> Optional[str]:
    """Extract YouTube video ID from various URL formats."""
    patterns = [
        r'youtube\.com/watch\?v=([^&]+)',
        r'youtu\.be/([^?]+)',
        r'youtube\.com/shorts/([^?]+)',
        r'youtube\.com/embed/([^?]+)',
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


def get_video_metadata(video_id: str) -> Optional[dict]:
    """Fetch video metadata via YouTube oEmbed API."""
    try:
        url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
        response = requests.get(url, timeout=10)
        if response.ok:
            data = response.json()
            return {
                "title": data.get("title"),
                "author": data.get("author_name"),
                "thumbnail": f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg",
            }
    except Exception as e:
        console.print(f"[yellow]Warning: Could not fetch metadata: {e}[/yellow]")
    return None


def get_transcript(video_id: str) -> Optional[str]:
    """Fetch transcript using youtube-transcript-api."""
    if not HAS_TRANSCRIPT_API:
        return None

    try:
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=['en'])
        return " ".join([t["text"] for t in transcript_list])
    except Exception as e:
        console.print(f"[yellow]Warning: Could not fetch transcript: {e}[/yellow]")
    return None


def categorize_content(title: str, description: str = "", tags: list = None) -> list:
    """Auto-categorize based on keywords."""
    text = f"{title} {description} {' '.join(tags or [])}".lower()

    categories = []
    patterns = {
        "Programming": ["code", "coding", "programming", "developer", "software", "python", "javascript", "typescript"],
        "AI & Machine Learning": ["ai", "machine learning", "ml", "gpt", "llm", "neural", "deep learning", "claude", "anthropic"],
        "Web Development": ["react", "vue", "angular", "html", "css", "frontend", "backend", "node", "web"],
        "DevOps": ["docker", "kubernetes", "ci/cd", "devops", "aws", "cloud", "terraform"],
        "Architecture": ["architecture", "design patterns", "microservices", "system design"],
        "Productivity": ["productivity", "workflow", "efficiency", "tips"],
    }

    for category, keywords in patterns.items():
        if any(kw in text for kw in keywords):
            categories.append(category)

    return categories if categories else ["Uncategorized"]


def create_interest(data: dict) -> Optional[dict]:
    """Create a new interest via the API."""
    try:
        response = requests.post(f"{API_BASE}/interests", json=data, timeout=10)
        if response.ok:
            return response.json()
        console.print(f"[red]API error: {response.status_code}[/red]")
    except Exception as e:
        console.print(f"[red]Failed to create interest: {e}[/red]")
    return None


def save_transcript(item_id: str, transcript: str) -> bool:
    """Save transcript to the API."""
    try:
        response = requests.put(
            f"{API_BASE}/transcripts/{item_id}",
            json={"transcript": transcript},
            timeout=10
        )
        return response.ok
    except Exception:
        return False


def import_video(url: str) -> Optional[dict]:
    """Import a single video with all enrichment."""
    video_id = extract_video_id(url)
    if not video_id:
        console.print(f"[red]Invalid YouTube URL: {url}[/red]")
        return None

    # Get metadata
    metadata = get_video_metadata(video_id)
    if not metadata:
        console.print(f"[red]Could not fetch metadata for: {url}[/red]")
        return None

    # Get transcript
    transcript = get_transcript(video_id)

    # Auto-categorize
    categories = categorize_content(metadata["title"])

    # Prepare data
    now = datetime.utcnow().isoformat() + "Z"
    interest_data = {
        "url": f"https://www.youtube.com/watch?v={video_id}",
        "type": "youtube",
        "title": metadata["title"],
        "author": metadata["author"],
        "channelName": metadata["author"],
        "thumbnail": metadata["thumbnail"],
        "status": "backlog",
        "tags": [],
        "categories": categories,
        "hasTranscript": bool(transcript),
        "createdAt": now,
        "updatedAt": now,
    }

    # Create interest
    result = create_interest(interest_data)
    if not result:
        return None

    # Save transcript if available
    if transcript and result.get("id"):
        save_transcript(result["id"], transcript)

    return result


def main():
    parser = argparse.ArgumentParser(
        description="Batch import YouTube videos into War Goat",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    # Import from a file with URLs (one per line)
    python scripts/batch_import.py --urls urls.txt

    # Import specific URLs
    python scripts/batch_import.py "https://youtube.com/watch?v=..." "https://youtube.com/watch?v=..."
        """
    )
    parser.add_argument("urls", nargs="*", help="YouTube URLs to import")
    parser.add_argument("--urls-file", "-f", help="File containing URLs (one per line)")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be imported without saving")

    args = parser.parse_args()

    # Collect URLs
    urls = list(args.urls)
    if args.urls_file:
        try:
            with open(args.urls_file) as f:
                urls.extend(line.strip() for line in f if line.strip() and not line.startswith("#"))
        except FileNotFoundError:
            console.print(f"[red]File not found: {args.urls_file}[/red]")
            sys.exit(1)

    if not urls:
        console.print("[yellow]No URLs provided. Use --help for usage.[/yellow]")
        sys.exit(1)

    console.print(f"\n[bold]War Goat Batch Import[/bold]")
    console.print(f"Importing {len(urls)} video(s)...\n")

    results = []

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        task = progress.add_task("Importing videos...", total=len(urls))

        for url in urls:
            progress.update(task, description=f"Processing: {url[:50]}...")

            if args.dry_run:
                video_id = extract_video_id(url)
                metadata = get_video_metadata(video_id) if video_id else None
                results.append({
                    "url": url,
                    "title": metadata.get("title", "Unknown") if metadata else "Invalid URL",
                    "status": "dry-run",
                })
            else:
                result = import_video(url)
                results.append({
                    "url": url,
                    "title": result.get("title", "Unknown") if result else "Failed",
                    "status": "success" if result else "failed",
                    "id": result.get("id") if result else None,
                })

            progress.advance(task)

    # Display results
    console.print("\n")
    table = Table(title="Import Results")
    table.add_column("#", style="dim")
    table.add_column("Title", style="cyan")
    table.add_column("Status", style="green")

    for i, result in enumerate(results, 1):
        status_style = "green" if result["status"] == "success" else "yellow" if result["status"] == "dry-run" else "red"
        table.add_row(str(i), result["title"][:50], f"[{status_style}]{result['status']}[/{status_style}]")

    console.print(table)

    success_count = sum(1 for r in results if r["status"] == "success")
    console.print(f"\n[bold]Summary:[/bold] {success_count}/{len(results)} videos imported successfully")


if __name__ == "__main__":
    main()
