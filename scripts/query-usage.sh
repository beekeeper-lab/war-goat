#!/bin/bash
#
# Query AI Usage Data
#
# Usage: query-usage.sh <command> [args]
#
# Commands:
#   summary             Show overall usage summary
#   by-workflow         Show usage grouped by workflow ID
#   by-stage            Show usage grouped by stage
#   workflow <id>       Show details for a specific workflow
#   recent [n]          Show last n records (default: 10)
#   expensive [n]       Show top n most expensive workflows (default: 10)
#

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
USAGE_LOG="${PROJECT_DIR}/data/ai-usage.jsonl"

if [ ! -f "$USAGE_LOG" ]; then
    echo "No usage data found at $USAGE_LOG"
    echo "Run some workflows first to generate data."
    exit 1
fi

case "$1" in
    summary)
        echo "=== AI Usage Summary ==="
        jq -s '
            {
                total_records: length,
                total_tokens: (map(.total_tokens) | add),
                total_input: (map(.input_tokens) | add),
                total_output: (map(.output_tokens) | add),
                total_cache_read: (map(.cache_read_tokens) | add),
                total_cache_write: (map(.cache_write_tokens) | add),
                total_tool_calls: (map(.tool_calls) | add),
                total_duration_sec: ((map(.duration_ms) | add) / 1000 | floor),
                unique_workflows: (map(.work_item_id) | unique | length)
            }
        ' "$USAGE_LOG"
        ;;

    by-workflow)
        echo "=== Usage by Workflow ==="
        jq -s '
            group_by(.work_item_id)
            | map({
                id: .[0].work_item_id,
                stages: length,
                total_tokens: (map(.total_tokens) | add),
                tool_calls: (map(.tool_calls) | add),
                duration_sec: ((map(.duration_ms) | add) / 1000 | floor)
            })
            | sort_by(-.total_tokens)
        ' "$USAGE_LOG"
        ;;

    by-stage)
        echo "=== Average Usage by Stage ==="
        jq -s '
            group_by(.stage)
            | map({
                stage: .[0].stage,
                count: length,
                avg_tokens: ((map(.total_tokens) | add) / length | floor),
                avg_input: ((map(.input_tokens) | add) / length | floor),
                avg_output: ((map(.output_tokens) | add) / length | floor),
                avg_tool_calls: ((map(.tool_calls) | add) / length | floor),
                avg_duration_sec: ((map(.duration_ms) | add) / length / 1000 | floor)
            })
            | sort_by(.stage)
        ' "$USAGE_LOG"
        ;;

    workflow)
        if [ -z "$2" ]; then
            echo "Usage: query-usage.sh workflow <id>"
            exit 1
        fi
        echo "=== Workflow $2 Details ==="

        # Show from centralized log
        echo ""
        echo "From central log:"
        jq -s "map(select(.work_item_id == \"$2\"))" "$USAGE_LOG"

        # Show from workflow summary if exists
        WORKFLOW_USAGE="${PROJECT_DIR}/workflow/$2/usage.json"
        if [ -f "$WORKFLOW_USAGE" ]; then
            echo ""
            echo "From workflow summary:"
            cat "$WORKFLOW_USAGE" | jq .
        fi
        ;;

    recent)
        N="${2:-10}"
        echo "=== Last $N Records ==="
        tail -n "$N" "$USAGE_LOG" | jq -s '.'
        ;;

    expensive)
        N="${2:-10}"
        echo "=== Top $N Most Expensive Workflows ==="
        jq -s "
            group_by(.work_item_id)
            | map({
                id: .[0].work_item_id,
                total_tokens: (map(.total_tokens) | add)
            })
            | sort_by(-.total_tokens)
            | .[0:$N]
        " "$USAGE_LOG"
        ;;

    *)
        echo "Usage: query-usage.sh <command> [args]"
        echo ""
        echo "Commands:"
        echo "  summary             Show overall usage summary"
        echo "  by-workflow         Show usage grouped by workflow ID"
        echo "  by-stage            Show usage grouped by stage"
        echo "  workflow <id>       Show details for a specific workflow"
        echo "  recent [n]          Show last n records (default: 10)"
        echo "  expensive [n]       Show top n most expensive workflows (default: 10)"
        ;;
esac
