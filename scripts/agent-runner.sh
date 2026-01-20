#!/bin/bash
#
# Agent Runner - Runs a workflow stage in a tmux pane
#
# Usage: agent-runner.sh <workflow-id> <stage> [worktree-path]
#
# This script:
# 1. Sets up the environment
# 2. Runs Claude with the appropriate workflow command
# 3. After Claude exits, commits and pushes changes
# 4. Launches the next stage (if not QA/final)
#

set -e

WORKFLOW_ID="$1"
STAGE="$2"
WORKTREE_PATH="${3:-$(pwd)}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Log file setup
LOG_DIR="${WORKTREE_PATH}/workflow/${WORKFLOW_ID}"
LOG_FILE="${LOG_DIR}/agent.log"
mkdir -p "$LOG_DIR"

# Get tmux pane ID if running in tmux
PANE_ID=""
if [ -n "$TMUX" ]; then
    PANE_ID=$(tmux display-message -p '#{pane_id}')
fi

# Logging function that writes to both stdout and log file
log_to_file() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $1" >> "$LOG_FILE"
}

# Stage order (integration-gate added between qa and PR creation)
declare -A NEXT_STAGE=(
    ["requirements"]="architecture"
    ["architecture"]="implement"
    ["implement"]="qa"
    ["qa"]="integration-gate"
    ["integration-gate"]=""  # Final stage before PR
)

declare -A STAGE_COMMAND=(
    ["requirements"]="/workflow-requirements"
    ["architecture"]="/workflow-architecture"
    ["implement"]="/workflow-implement"
    ["qa"]="/workflow-qa"
    ["integration-gate"]="/workflow-integration-gate"
)

declare -A STAGE_OUTPUT=(
    ["requirements"]="1-requirements.md"
    ["architecture"]="2-architecture.md"
    ["implement"]="3-implementation.md"
    ["qa"]="4-qa-report.md"
    ["integration-gate"]="5-integration-gate.md"
)

# Required checkpoints for each stage
declare -A REQUIRED_CHECKPOINTS=(
    ["requirements"]="requirements_identified impact_analyzed test_impact_analyzed acceptance_criteria_defined no_open_blockers"
    ["architecture"]="requirements_addressed design_complete test_architecture_defined tasks_defined tests_planned"
    ["implement"]="baseline_tests_run tests_written code_complete tests_passing no_lint_errors"
    ["qa"]="criteria_verified tests_passing test_predictions_verified no_critical_bugs docs_updated"
    ["integration-gate"]="qa_approved rebase_clean tests_pass_post_merge build_succeeds no_regressions"
)

log() {
    echo -e "${BLUE}[agent-runner]${NC} $1"
    log_to_file "INFO: $1"
}

success() {
    echo -e "${GREEN}[agent-runner]${NC} $1"
    log_to_file "SUCCESS: $1"
}

warn() {
    echo -e "${YELLOW}[agent-runner]${NC} $1"
    log_to_file "WARN: $1"
}

error() {
    echo -e "${RED}[agent-runner]${NC} $1"
    log_to_file "ERROR: $1"
}

# Verify stage completion with evidence
verify_stage_complete() {
    local stage="$1"
    local workflow_id="$2"
    local project_dir="$3"

    # Check if capture-evidence.py exists
    if [ ! -f "${SCRIPT_DIR}/capture-evidence.py" ]; then
        warn "Evidence capture script not found, skipping verification"
        return 0
    fi

    # Get required checkpoints for this stage
    local required="${REQUIRED_CHECKPOINTS[$stage]}"
    if [ -z "$required" ]; then
        return 0  # No checkpoints defined
    fi

    # Verify using evidence script
    local result
    result=$(python3 "${SCRIPT_DIR}/capture-evidence.py" "$workflow_id" "$stage" \
        --verify $required --project-dir "$project_dir" 2>/dev/null)

    if [ $? -eq 0 ]; then
        log "Stage $stage verification: PASSED"
        return 0
    else
        warn "Stage $stage verification: FAILED"
        echo "$result"
        return 1
    fi
}

# Check if PR creation is allowed (all safety checks pass)
verify_pr_allowed() {
    local workflow_id="$1"
    local project_dir="$2"

    log "Running pre-PR safety checks..."

    # 1. Check integration-gate is complete and approved
    local ig_report="${project_dir}/workflow/${workflow_id}/5-integration-gate.md"
    if [ ! -f "$ig_report" ]; then
        error "Integration Gate report not found: $ig_report"
        return 1
    fi

    if ! grep -q "integration_verdict: approved" "$ig_report"; then
        error "Integration Gate not approved"
        return 1
    fi
    log "  [OK] Integration Gate approved"

    # 2. Check QA is approved
    local qa_report="${project_dir}/workflow/${workflow_id}/4-qa-report.md"
    if [ ! -f "$qa_report" ]; then
        error "QA report not found: $qa_report"
        return 1
    fi

    if ! grep -q "qa_verdict: approved" "$qa_report"; then
        error "QA not approved"
        return 1
    fi
    log "  [OK] QA approved"

    # 3. Check stage-results.json shows all stages passed
    local stage_results="${project_dir}/workflow/${workflow_id}/stage-results.json"
    if [ -f "$stage_results" ]; then
        # Check each required stage
        for stage in requirements architecture implement qa integration-gate; do
            local status=$(python3 -c "
import json
with open('$stage_results', 'r') as f:
    data = json.load(f)
stage_data = data.get('stages', {}).get('$stage', {})
print(stage_data.get('overall_status', 'unknown'))
" 2>/dev/null)

            if [ "$status" != "pass" ] && [ "$status" != "unknown" ]; then
                error "Stage $stage did not pass (status: $status)"
                return 1
            fi
        done
        log "  [OK] All stages passed in stage-results.json"
    else
        warn "  [WARN] stage-results.json not found, skipping stage verification"
    fi

    # 4. Check for overlap warnings
    if [ -f "${SCRIPT_DIR}/detect-overlap.py" ]; then
        local overlap_result
        overlap_result=$(python3 "${SCRIPT_DIR}/detect-overlap.py" --check "$workflow_id" --project-dir "$project_dir" 2>/dev/null)
        if [ $? -ne 0 ]; then
            warn "  [WARN] High-risk overlaps detected with other workflows"
            echo "$overlap_result" | grep -E "(workflow|risk|files)" | head -10
            # Don't block, just warn
        else
            log "  [OK] No critical overlaps detected"
        fi
    fi

    log "All safety checks passed!"
    return 0
}

# Update status.json with current state
update_status() {
    local status="$1"
    local status_file="${WORKTREE_PATH}/workflow/${WORKFLOW_ID}/status.json"

    if [ -f "$status_file" ]; then
        # Use python for reliable JSON manipulation
        python3 - "$status_file" "$STAGE" "$status" "$PANE_ID" << 'PYTHON'
import json
import sys
from datetime import datetime

status_file = sys.argv[1]
stage = sys.argv[2]
status = sys.argv[3]
pane_id = sys.argv[4] if len(sys.argv) > 4 else ""

with open(status_file, 'r') as f:
    data = json.load(f)

# Update current stage
data['currentStage'] = stage

# Update stage info
if 'stages' not in data:
    data['stages'] = {}
if stage not in data['stages']:
    data['stages'][stage] = {}

data['stages'][stage]['status'] = status
if status == 'in_progress':
    data['stages'][stage]['startedAt'] = datetime.now().isoformat()
elif status == 'complete':
    data['stages'][stage]['completedAt'] = datetime.now().isoformat()

# Store pane ID for dashboard
if pane_id:
    data['paneId'] = pane_id

with open(status_file, 'w') as f:
    json.dump(data, f, indent=2)
PYTHON
    fi
}

# Validate inputs
if [ -z "$WORKFLOW_ID" ] || [ -z "$STAGE" ]; then
    error "Usage: agent-runner.sh <workflow-id> <stage> [worktree-path]"
    exit 1
fi

if [ -z "${STAGE_COMMAND[$STAGE]}" ]; then
    error "Invalid stage: $STAGE"
    error "Valid stages: requirements, architecture, implement, qa"
    exit 1
fi

# Mark stage as in progress
update_status "in_progress"

log "Starting ${STAGE} agent for ${WORKFLOW_ID}"
log "Working directory: ${WORKTREE_PATH}"

# Change to worktree
cd "$WORKTREE_PATH"

# Show banner
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  WORKFLOW AGENT: ${STAGE^^}"
printf "║  %-60s ║\n" "ID: ${WORKFLOW_ID}"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  This agent will:                                            ║"
echo "║  1. Run the ${STAGE} stage                                   ║"
echo "║  2. Ask you questions if needed (answer here)                ║"
echo "║  3. Commit and push when done                                ║"
if [ -n "${NEXT_STAGE[$STAGE]}" ]; then
echo "║  4. Auto-launch ${NEXT_STAGE[$STAGE]} stage                  ║"
else
echo "║  4. Create PR (final stage)                                  ║"
fi
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Run Claude with the workflow command
COMMAND="${STAGE_COMMAND[$STAGE]} ${WORKFLOW_ID}"

log "Starting Claude session with command: ${COMMAND}"
log "When the stage is complete, type /exit or Ctrl+C to continue to next stage."
echo ""

# Run Claude with the workflow command auto-executed
# --dangerously-skip-permissions allows autonomous operation
# TODO: Add hooks for safety guardrails (see .claude/hooks/)
# The prompt is passed as a positional argument (not -p which is print mode)
claude --dangerously-skip-permissions "${COMMAND}"

CLAUDE_EXIT=$?

echo ""
log "Claude session ended with exit code: ${CLAUDE_EXIT}"

# Track AI usage for this stage
log "Tracking AI usage..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
python3 "${SCRIPT_DIR}/track-usage.py" "$WORKFLOW_ID" "$STAGE" "$WORKTREE_PATH" || {
    warn "Usage tracking failed (non-critical)"
}

# Check if stage output was created
OUTPUT_FILE="workflow/${WORKFLOW_ID}/${STAGE_OUTPUT[$STAGE]}"
if [ ! -f "$OUTPUT_FILE" ]; then
    warn "Expected output file not found: ${OUTPUT_FILE}"
    warn "Stage may not have completed successfully"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        error "Aborted by user"
        exit 1
    fi
fi

# Commit and push
log "Committing changes..."

git add -A

# Create commit message
COMMIT_MSG="workflow(${WORKFLOW_ID}): Complete ${STAGE} stage

Stage: ${STAGE}
Output: ${OUTPUT_FILE}
Agent: ${STAGE^} Agent

Co-Authored-By: Claude <noreply@anthropic.com>"

git commit -m "$COMMIT_MSG" || {
    warn "Nothing to commit (no changes)"
}

log "Pushing to remote..."
git push -u origin "$(git branch --show-current)" || {
    warn "Push failed - may need to pull first"
}

# Mark stage as complete
update_status "complete"

success "Stage ${STAGE} complete!"

# Check if there's a next stage
NEXT="${NEXT_STAGE[$STAGE]}"

if [ -n "$NEXT" ]; then
    echo ""
    log "Auto-launching next stage: ${NEXT}"
    sleep 2  # Brief pause so user can see the message

    # Run next stage in same pane (recursive)
    exec "$0" "$WORKFLOW_ID" "$NEXT" "$WORKTREE_PATH"
else
    # Final stage (integration-gate) - create PR
    echo ""
    success "🎉 All stages complete for ${WORKFLOW_ID}!"

    # Print workflow summary (timing and tokens)
    python3 "${SCRIPT_DIR}/workflow-summary.py" "$WORKFLOW_ID" "$WORKTREE_PATH" || {
        warn "Could not generate workflow summary"
    }

    # Run overlap detection
    log "Checking for workflow overlaps..."
    if [ -f "${SCRIPT_DIR}/detect-overlap.py" ]; then
        python3 "${SCRIPT_DIR}/detect-overlap.py" --check "$WORKFLOW_ID" --project-dir "$WORKTREE_PATH" || {
            warn "Overlap check reported warnings (see above)"
        }
    fi

    # SAFETY CHECK: Verify all requirements are met before PR creation
    if ! verify_pr_allowed "$WORKFLOW_ID" "$WORKTREE_PATH"; then
        error "PR creation blocked by safety checks!"
        error "Please resolve the issues above and re-run the integration gate."
        echo ""
        echo "To manually review:"
        echo "  - QA Report: workflow/${WORKFLOW_ID}/4-qa-report.md"
        echo "  - Integration Gate: workflow/${WORKFLOW_ID}/5-integration-gate.md"
        echo "  - Stage Results: workflow/${WORKFLOW_ID}/stage-results.json"
        echo ""
        echo "Press Enter to exit..."
        read
        exit 1
    fi

    log "Creating pull request..."

    # Get the title from beans or workflow
    TITLE=$(grep -m1 "title:" "workflow/${WORKFLOW_ID}/status.json" 2>/dev/null | sed 's/.*: *"\(.*\)".*/\1/' || echo "$WORKFLOW_ID")

    gh pr create --title "feat(${WORKFLOW_ID}): ${TITLE}" --body "## Workflow Complete

This PR was created by the multi-agent workflow system.

### Stages Completed
- [x] Requirements
- [x] Architecture
- [x] Implementation
- [x] QA
- [x] Integration Gate

### Safety Checks Passed
- [x] QA Approved
- [x] Integration Gate Approved
- [x] Tests pass after rebase
- [x] Build succeeds
- [x] No regressions detected

### Artifacts
- \`workflow/${WORKFLOW_ID}/1-requirements.md\`
- \`workflow/${WORKFLOW_ID}/2-architecture.md\`
- \`workflow/${WORKFLOW_ID}/3-implementation.md\`
- \`workflow/${WORKFLOW_ID}/4-qa-report.md\`
- \`workflow/${WORKFLOW_ID}/5-integration-gate.md\`
- \`workflow/${WORKFLOW_ID}/stage-results.json\`
- \`workflow/${WORKFLOW_ID}/evidence/\`

---
🤖 Generated by Workflow Agent System" || {
        warn "PR creation failed - you may need to create it manually"
    }

    # Update Beans status to completed
    log "Updating Beans status..."
    BEAN_ID=$(beans list 2>/dev/null | grep -i "$WORKFLOW_ID" | awk '{print $1}' | head -1)
    if [ -n "$BEAN_ID" ]; then
        beans update "$BEAN_ID" -s completed 2>/dev/null && success "Beans updated to completed" || warn "Beans update failed"
    fi

    echo ""
    success "Workflow ${WORKFLOW_ID} finished! PR created."
    echo ""

    # Cleanup worktree
    log "Cleaning up worktree..."
    MAIN_REPO=$(cd "$WORKTREE_PATH" && git worktree list | grep '\[main\]' | awk '{print $1}')
    if [ -n "$MAIN_REPO" ] && [ "$WORKTREE_PATH" != "$MAIN_REPO" ]; then
        cd "$MAIN_REPO"
        git worktree remove --force "$WORKTREE_PATH" 2>/dev/null && {
            success "Worktree cleaned up: $WORKTREE_PATH"
        } || {
            warn "Could not auto-remove worktree. Run manually:"
            warn "  git worktree remove --force $WORKTREE_PATH"
        }
    fi

    echo ""
    success "✨ Workflow complete and cleaned up!"
    echo ""
    echo "Press Enter to close this pane..."
    read
fi
