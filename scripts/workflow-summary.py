#!/usr/bin/env python3
"""
Print Workflow Summary

Displays a formatted summary of timing and token usage for a completed workflow.

Usage: workflow-summary.py <workflow-id> <project-dir>
"""

import json
import sys
from pathlib import Path


def format_duration(ms: int) -> str:
    """Format milliseconds as human-readable duration."""
    if ms < 1000:
        return f"{ms}ms"

    seconds = ms / 1000
    if seconds < 60:
        return f"{seconds:.1f}s"

    minutes = seconds / 60
    if minutes < 60:
        remaining_seconds = seconds % 60
        return f"{int(minutes)}m {int(remaining_seconds)}s"

    hours = minutes / 60
    remaining_minutes = minutes % 60
    return f"{int(hours)}h {int(remaining_minutes)}m"


def format_tokens(count: int) -> str:
    """Format token count with commas."""
    return f"{count:,}"


def print_summary(workflow_id: str, project_dir: Path):
    """Print formatted workflow summary."""
    usage_path = project_dir / "workflow" / workflow_id / "usage.json"

    if not usage_path.exists():
        print(f"No usage data found for workflow {workflow_id}")
        return False

    with open(usage_path, 'r') as f:
        data = json.load(f)

    stages = data.get('stages', {})
    totals = data.get('totals', {})

    # Define stage order for display
    stage_order = ['requirements', 'architecture', 'implement', 'qa']
    stage_names = {
        'requirements': 'Requirements',
        'architecture': 'Architecture',
        'implement': 'Implementation',
        'qa': 'QA'
    }

    # Print header
    print()
    print("=" * 78)
    print(f"  WORKFLOW SUMMARY: {workflow_id}")
    print("=" * 78)
    print()

    # Print per-stage breakdown
    print("  Stage Breakdown:")
    print("  " + "-" * 74)
    print(f"  {'Stage':<15} {'Duration':>12} {'Input':>12} {'Output':>12} {'Total':>12} {'Tools':>8}")
    print("  " + "-" * 74)

    for stage in stage_order:
        if stage in stages:
            s = stages[stage]
            duration = format_duration(s.get('duration_ms', 0))
            input_tok = format_tokens(s.get('input_tokens', 0))
            output_tok = format_tokens(s.get('output_tokens', 0))
            total_tok = format_tokens(s.get('total_tokens', 0))
            tools = s.get('tool_calls', 0)

            print(f"  {stage_names.get(stage, stage):<15} {duration:>12} {input_tok:>12} {output_tok:>12} {total_tok:>12} {tools:>8}")

    print("  " + "-" * 74)

    # Print totals
    total_duration = format_duration(totals.get('duration_ms', 0))
    total_input = format_tokens(totals.get('input_tokens', 0))
    total_output = format_tokens(totals.get('output_tokens', 0))
    total_all = format_tokens(totals.get('total_tokens', 0))
    total_tools = totals.get('tool_calls', 0)

    print(f"  {'TOTAL':<15} {total_duration:>12} {total_input:>12} {total_output:>12} {total_all:>12} {total_tools:>8}")
    print("  " + "-" * 74)
    print()

    # Print cache stats
    cache_read = totals.get('cache_read_tokens', 0)
    cache_write = totals.get('cache_write_tokens', 0)
    if cache_read > 0 or cache_write > 0:
        print(f"  Cache Statistics:")
        print(f"    Cache reads:  {format_tokens(cache_read)} tokens")
        print(f"    Cache writes: {format_tokens(cache_write)} tokens")
        print()

    # Print model info if available
    models = set()
    for stage_data in stages.values():
        model = stage_data.get('model', 'unknown')
        if model and model != 'unknown':
            models.add(model)

    if models:
        print(f"  Model(s): {', '.join(sorted(models))}")
        print()

    print("=" * 78)
    print()

    return True


def main():
    if len(sys.argv) < 3:
        print("Usage: workflow-summary.py <workflow-id> <project-dir>", file=sys.stderr)
        sys.exit(1)

    workflow_id = sys.argv[1]
    project_dir = Path(sys.argv[2])

    if not print_summary(workflow_id, project_dir):
        sys.exit(1)


if __name__ == "__main__":
    main()
