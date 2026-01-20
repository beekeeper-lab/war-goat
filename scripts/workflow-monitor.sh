#!/bin/bash
#
# Workflow Monitor - Dashboard for tracking multiple workflows
#
# Usage: workflow-monitor.sh [refresh-interval]
#
# Displays a real-time dashboard showing:
# - All active workflows and their current stage
# - Recent output from each workflow pane
# - Alerts when a workflow needs input
#

REFRESH_INTERVAL="${1:-5}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# Stage progress indicators
declare -A STAGE_PROGRESS=(
    ["requirements"]="1"
    ["architecture"]="2"
    ["implement"]="3"
    ["qa"]="4"
)

# Clear screen and move cursor to top
clear_screen() {
    printf '\033[2J\033[H'
}

# Draw progress bar
draw_progress() {
    local current=$1
    local total=4
    local width=20
    local filled=$((current * width / total))
    local empty=$((width - filled))

    printf "["
    printf "%${filled}s" | tr ' ' '█'
    printf "%${empty}s" | tr ' ' '░'
    printf "] %d/%d" "$current" "$total"
}

# Get elapsed time since timestamp
get_elapsed() {
    local start_time="$1"
    if [ -z "$start_time" ] || [ "$start_time" = "null" ]; then
        echo "—"
        return
    fi

    # Parse ISO timestamp and calculate elapsed
    local start_epoch=$(date -d "$start_time" +%s 2>/dev/null || echo "0")
    local now_epoch=$(date +%s)
    local elapsed=$((now_epoch - start_epoch))

    if [ $elapsed -lt 60 ]; then
        echo "${elapsed}s"
    elif [ $elapsed -lt 3600 ]; then
        echo "$((elapsed / 60))m $((elapsed % 60))s"
    else
        echo "$((elapsed / 3600))h $((elapsed % 3600 / 60))m"
    fi
}

# Capture recent output from tmux pane
capture_pane_output() {
    local pane_id="$1"
    local lines="${2:-5}"

    if [ -z "$pane_id" ] || [ "$pane_id" = "null" ]; then
        echo "(no pane)"
        return
    fi

    # Check if pane exists
    if ! tmux list-panes -a -F '#{pane_id}' 2>/dev/null | grep -q "^${pane_id}$"; then
        echo "(pane closed)"
        return
    fi

    # Capture last N lines from pane
    tmux capture-pane -t "$pane_id" -p -S -"$lines" 2>/dev/null | tail -"$lines" | while read -r line; do
        # Truncate long lines and remove control characters
        echo "$line" | tr -d '\r' | cut -c1-70
    done
}

# Check if pane is waiting for input (cursor at prompt)
check_waiting_for_input() {
    local pane_id="$1"

    if [ -z "$pane_id" ] || [ "$pane_id" = "null" ]; then
        return 1
    fi

    # Get the last line of the pane
    local last_line=$(tmux capture-pane -t "$pane_id" -p -S -1 2>/dev/null | tail -1)

    # Check for common input prompts
    if echo "$last_line" | grep -qE '(\?|>|:)\s*$|Continue\?|y/N|Y/n|\[.*\]'; then
        return 0
    fi
    return 1
}

# Get workflow info from status.json
get_workflow_info() {
    local workflow_id="$1"
    local status_file

    # Check both main project and worktrees for status.json
    if [ -f "${PROJECT_ROOT}/workflow/${workflow_id}/status.json" ]; then
        status_file="${PROJECT_ROOT}/workflow/${workflow_id}/status.json"
    else
        # Search in worktrees
        for worktree in "${PROJECT_ROOT}"/../*-${workflow_id,,}/workflow/${workflow_id}/status.json; do
            if [ -f "$worktree" ]; then
                status_file="$worktree"
                break
            fi
        done
    fi

    if [ -z "$status_file" ] || [ ! -f "$status_file" ]; then
        return 1
    fi

    python3 - "$status_file" << 'PYTHON'
import json
import sys

with open(sys.argv[1], 'r') as f:
    data = json.load(f)

current_stage = data.get('currentStage', 'unknown')
pane_id = data.get('paneId', '')
title = data.get('title', '')[:40]
workflow_type = data.get('type', 'feature')

# Get stage info
stages = data.get('stages', {})
stage_info = stages.get(current_stage, {})
status = stage_info.get('status', 'unknown')
started_at = stage_info.get('startedAt', '')

print(f"{current_stage}|{pane_id}|{title}|{workflow_type}|{status}|{started_at}")
PYTHON
}

# Get recent log entries
get_recent_logs() {
    local workflow_id="$1"
    local lines="${2:-3}"
    local log_file

    # Find log file
    for path in "${PROJECT_ROOT}/workflow/${workflow_id}/agent.log" \
                "${PROJECT_ROOT}"/../*-${workflow_id,,}/workflow/${workflow_id}/agent.log; do
        if [ -f "$path" ]; then
            log_file="$path"
            break
        fi
    done

    if [ -n "$log_file" ] && [ -f "$log_file" ]; then
        tail -"$lines" "$log_file" 2>/dev/null | while read -r line; do
            echo "$line" | cut -c1-70
        done
    fi
}

# Find all active workflows
find_active_workflows() {
    local workflows=()

    # Check workflow directories in main project
    for dir in "${PROJECT_ROOT}"/workflow/*/; do
        if [ -d "$dir" ]; then
            local wf_id=$(basename "$dir")
            local status_file="${dir}status.json"

            if [ -f "$status_file" ]; then
                # Check if workflow is active (has a pane or recent activity)
                local pane_id=$(python3 -c "import json; print(json.load(open('$status_file')).get('paneId', ''))" 2>/dev/null)
                local current_stage=$(python3 -c "import json; print(json.load(open('$status_file')).get('currentStage', ''))" 2>/dev/null)

                # Include if has pane or is not completed
                if [ -n "$pane_id" ] || [ "$current_stage" != "completed" ]; then
                    workflows+=("$wf_id")
                fi
            fi
        fi
    done

    # Also check worktrees
    for worktree in "${PROJECT_ROOT}"/../*-*/; do
        if [ -d "$worktree" ]; then
            for status_file in "$worktree"/workflow/*/status.json; do
                if [ -f "$status_file" ]; then
                    local wf_id=$(basename "$(dirname "$status_file")")
                    # Check if not already in list
                    if [[ ! " ${workflows[*]} " =~ " ${wf_id} " ]]; then
                        workflows+=("$wf_id")
                    fi
                fi
            done
        fi
    done

    echo "${workflows[@]}"
}

# Draw the dashboard
draw_dashboard() {
    clear_screen

    local now=$(date '+%Y-%m-%d %H:%M:%S')

    # Header
    echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${CYAN}║${NC}  ${BOLD}WORKFLOW DASHBOARD${NC}                                      ${DIM}Refresh: ${REFRESH_INTERVAL}s${NC}  ${BOLD}${CYAN}║${NC}"
    echo -e "${BOLD}${CYAN}║${NC}  ${DIM}${now}${NC}                                                              ${BOLD}${CYAN}║${NC}"
    echo -e "${BOLD}${CYAN}╠══════════════════════════════════════════════════════════════════════════════╣${NC}"

    # Find active workflows
    local workflows=($(find_active_workflows))

    if [ ${#workflows[@]} -eq 0 ]; then
        echo -e "${BOLD}${CYAN}║${NC}                                                                              ${BOLD}${CYAN}║${NC}"
        echo -e "${BOLD}${CYAN}║${NC}  ${DIM}No active workflows. Start one with:${NC}                                       ${BOLD}${CYAN}║${NC}"
        echo -e "${BOLD}${CYAN}║${NC}  ${YELLOW}./scripts/start-workflow.sh <ID> <type> \"<title>\"${NC}                          ${BOLD}${CYAN}║${NC}"
        echo -e "${BOLD}${CYAN}║${NC}                                                                              ${BOLD}${CYAN}║${NC}"
        echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
        return
    fi

    local needs_attention=()

    for wf_id in "${workflows[@]}"; do
        # Get workflow info
        local info=$(get_workflow_info "$wf_id")
        if [ -z "$info" ]; then
            continue
        fi

        IFS='|' read -r current_stage pane_id title wf_type status started_at <<< "$info"

        # Calculate progress
        local stage_num=${STAGE_PROGRESS[$current_stage]:-0}
        local progress=$(draw_progress "$stage_num")

        # Get elapsed time
        local elapsed=$(get_elapsed "$started_at")

        # Check if waiting for input
        local attention=""
        if check_waiting_for_input "$pane_id"; then
            attention="${RED}⚠️  NEEDS INPUT${NC}"
            needs_attention+=("$wf_id")
        fi

        # Status color
        local status_color="${GREEN}"
        case "$status" in
            in_progress) status_color="${YELLOW}" ;;
            failed) status_color="${RED}" ;;
            complete) status_color="${GREEN}" ;;
        esac

        # Draw workflow section
        echo -e "${BOLD}${CYAN}║${NC}                                                                              ${BOLD}${CYAN}║${NC}"
        printf "${BOLD}${CYAN}║${NC}  ${BOLD}${MAGENTA}%-8s${NC} ${DIM}[%s]${NC} %-40s ${BOLD}${CYAN}║${NC}\n" "$wf_id" "$wf_type" "$title"
        printf "${BOLD}${CYAN}║${NC}  ${progress}  ${status_color}%-12s${NC}  ${DIM}Running: ${elapsed}${NC}  %s ${BOLD}${CYAN}║${NC}\n" "$current_stage" "$attention"
        echo -e "${BOLD}${CYAN}║${NC}  ${DIM}────────────────────────────────────────────────────────────────────────${NC}  ${BOLD}${CYAN}║${NC}"

        # Show recent pane output
        echo -e "${BOLD}${CYAN}║${NC}  ${DIM}Recent output:${NC}                                                             ${BOLD}${CYAN}║${NC}"

        local pane_output=$(capture_pane_output "$pane_id" 3)
        while IFS= read -r line; do
            printf "${BOLD}${CYAN}║${NC}    ${DIM}%-72s${NC} ${BOLD}${CYAN}║${NC}\n" "$line"
        done <<< "$pane_output"

        echo -e "${BOLD}${CYAN}╠══════════════════════════════════════════════════════════════════════════════╣${NC}"
    done

    # Footer with instructions
    echo -e "${BOLD}${CYAN}║${NC}                                                                              ${BOLD}${CYAN}║${NC}"
    echo -e "${BOLD}${CYAN}║${NC}  ${DIM}Commands:${NC}  ${YELLOW}Ctrl+C${NC} exit  │  ${YELLOW}Ctrl+b →${NC} switch pane  │  ${YELLOW}beans list${NC} status     ${BOLD}${CYAN}║${NC}"

    if [ ${#needs_attention[@]} -gt 0 ]; then
        echo -e "${BOLD}${CYAN}║${NC}                                                                              ${BOLD}${CYAN}║${NC}"
        echo -e "${BOLD}${CYAN}║${NC}  ${RED}${BOLD}⚠️  ATTENTION NEEDED: ${needs_attention[*]}${NC}                                       ${BOLD}${CYAN}║${NC}"
        echo -e "${BOLD}${CYAN}║${NC}  ${RED}Switch to pane with Ctrl+b → to respond to prompts${NC}                        ${BOLD}${CYAN}║${NC}"
    fi

    echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
}

# Main loop
main() {
    # Check if in tmux
    if [ -z "$TMUX" ]; then
        echo -e "${YELLOW}Warning: Not running in tmux. Pane capture will not work.${NC}"
        echo -e "${DIM}Start tmux first, then run this script.${NC}"
        echo ""
    fi

    echo -e "${CYAN}Starting workflow monitor (refresh every ${REFRESH_INTERVAL}s)...${NC}"
    echo -e "${DIM}Press Ctrl+C to exit${NC}"
    sleep 1

    # Trap Ctrl+C for clean exit
    trap 'clear_screen; echo "Monitor stopped."; exit 0' INT

    while true; do
        draw_dashboard
        sleep "$REFRESH_INTERVAL"
    done
}

main "$@"
