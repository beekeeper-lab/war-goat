#!/usr/bin/env python3
"""
Track AI Usage for Workflow Stages

Extracts usage data from Claude session transcripts and stores it for analysis.

Usage: track-usage.py <workflow-id> <stage> <project-dir>

Outputs:
  - Appends to data/ai-usage.jsonl (centralized log)
  - Updates workflow/{id}/usage.json (per-workflow summary)
"""

import json
import sys
import os
from datetime import datetime, timezone
from pathlib import Path
import glob


def find_latest_transcript(project_path: str) -> Path | None:
    """Find the most recent Claude transcript for this project."""
    # Claude stores transcripts in ~/.claude/projects/{encoded-path}/
    home = Path.home()
    claude_projects = home / ".claude" / "projects"

    # Try multiple encoding strategies since Claude's encoding can vary
    encodings_to_try = [
        # Standard: replace / with -
        project_path.replace("/", "-").lstrip("-"),
        # Also replace _ with -
        project_path.replace("/", "-").replace("_", "-").lstrip("-"),
    ]

    for encoded in encodings_to_try:
        claude_project_dir = claude_projects / encoded
        if claude_project_dir.exists():
            break
    else:
        # Try finding with glob pattern matching the directory name
        dir_name = Path(project_path).name
        # Try both underscore and hyphen variants
        patterns = [
            f"*{dir_name}*",
            f"*{dir_name.replace('_', '-')}*",
        ]
        for pattern in patterns:
            matches = glob.glob(str(claude_projects / pattern))
            if matches:
                claude_project_dir = Path(matches[0])
                break
        else:
            return None

    # Find most recent .jsonl file
    transcripts = list(claude_project_dir.glob("*.jsonl"))
    if not transcripts:
        return None

    # Sort by modification time, most recent first
    transcripts.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    return transcripts[0]


def extract_usage_from_transcript(transcript_path: Path) -> dict:
    """Extract usage statistics from a Claude transcript."""
    total_input = 0
    total_output = 0
    total_cache_read = 0
    total_cache_write = 0
    tool_calls = 0
    model = "unknown"
    start_time = None
    end_time = None

    with open(transcript_path, 'r') as f:
        for line in f:
            try:
                entry = json.loads(line)

                # Track timestamps
                if 'timestamp' in entry:
                    ts = entry['timestamp']
                    if start_time is None:
                        start_time = ts
                    end_time = ts

                # Extract model and usage from message object (Claude's format)
                if 'message' in entry:
                    msg = entry['message']
                    if 'model' in msg:
                        model = msg['model']
                    if 'usage' in msg:
                        usage = msg['usage']
                        total_input += usage.get('input_tokens', 0)
                        total_output += usage.get('output_tokens', 0)
                        total_cache_read += usage.get('cache_read_input_tokens', 0)
                        total_cache_write += usage.get('cache_creation_input_tokens', 0)

                    # Count tool calls in message content
                    content = msg.get('content', [])
                    if isinstance(content, list):
                        for block in content:
                            if isinstance(block, dict) and block.get('type') == 'tool_use':
                                tool_calls += 1

                # Also check top-level usage (some formats)
                if 'usage' in entry and 'message' not in entry:
                    usage = entry['usage']
                    total_input += usage.get('input_tokens', 0)
                    total_output += usage.get('output_tokens', 0)
                    total_cache_read += usage.get('cache_read_input_tokens', 0)
                    total_cache_write += usage.get('cache_creation_input_tokens', 0)

                # Count standalone tool_use entries
                if entry.get('type') == 'tool_use':
                    tool_calls += 1

            except json.JSONDecodeError:
                continue

    # Calculate duration
    duration_ms = 0
    if start_time and end_time:
        try:
            start = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
            end = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
            duration_ms = int((end - start).total_seconds() * 1000)
        except:
            pass

    return {
        'input_tokens': total_input,
        'output_tokens': total_output,
        'cache_read_tokens': total_cache_read,
        'cache_write_tokens': total_cache_write,
        'total_tokens': total_input + total_output,
        'tool_calls': tool_calls,
        'duration_ms': duration_ms,
        'model': model
    }


def append_to_central_log(project_dir: Path, record: dict):
    """Append usage record to centralized JSONL log."""
    log_path = project_dir / "data" / "ai-usage.jsonl"
    log_path.parent.mkdir(parents=True, exist_ok=True)

    with open(log_path, 'a') as f:
        f.write(json.dumps(record) + '\n')


def update_workflow_summary(project_dir: Path, workflow_id: str, stage: str, usage: dict):
    """Update per-workflow usage summary."""
    workflow_dir = project_dir / "workflow" / workflow_id
    workflow_dir.mkdir(parents=True, exist_ok=True)

    summary_path = workflow_dir / "usage.json"

    # Load existing or create new
    if summary_path.exists():
        with open(summary_path, 'r') as f:
            summary = json.load(f)
    else:
        summary = {
            'work_item_id': workflow_id,
            'stages': {},
            'totals': {
                'input_tokens': 0,
                'output_tokens': 0,
                'cache_read_tokens': 0,
                'cache_write_tokens': 0,
                'total_tokens': 0,
                'tool_calls': 0,
                'duration_ms': 0
            }
        }

    # Add this stage
    summary['stages'][stage] = usage
    summary['last_updated'] = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')

    # Update totals
    for key in ['input_tokens', 'output_tokens', 'cache_read_tokens',
                'cache_write_tokens', 'total_tokens', 'tool_calls', 'duration_ms']:
        summary['totals'][key] = sum(
            s.get(key, 0) for s in summary['stages'].values()
        )

    with open(summary_path, 'w') as f:
        json.dump(summary, f, indent=2)


def main():
    if len(sys.argv) < 4:
        print("Usage: track-usage.py <workflow-id> <stage> <project-dir>", file=sys.stderr)
        sys.exit(1)

    workflow_id = sys.argv[1]
    stage = sys.argv[2]
    project_dir = Path(sys.argv[3])

    # Find the latest transcript
    transcript = find_latest_transcript(str(project_dir))

    if not transcript:
        print(f"Warning: Could not find Claude transcript for {project_dir}", file=sys.stderr)
        sys.exit(0)  # Don't fail the workflow

    print(f"Extracting usage from: {transcript}")

    # Extract usage
    usage = extract_usage_from_transcript(transcript)

    # Create the record
    record = {
        'timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
        'work_item_id': workflow_id,
        'stage': stage,
        **usage
    }

    # Append to central log
    append_to_central_log(project_dir, record)
    print(f"Appended to data/ai-usage.jsonl")

    # Update workflow summary
    update_workflow_summary(project_dir, workflow_id, stage, usage)
    print(f"Updated workflow/{workflow_id}/usage.json")

    # Print summary
    print(f"\n--- Usage Summary for {workflow_id}/{stage} ---")
    print(f"  Input tokens:  {usage['input_tokens']:,}")
    print(f"  Output tokens: {usage['output_tokens']:,}")
    print(f"  Cache read:    {usage['cache_read_tokens']:,}")
    print(f"  Cache write:   {usage['cache_write_tokens']:,}")
    print(f"  Total tokens:  {usage['total_tokens']:,}")
    print(f"  Tool calls:    {usage['tool_calls']}")
    print(f"  Duration:      {usage['duration_ms'] / 1000:.1f}s")


if __name__ == "__main__":
    main()
