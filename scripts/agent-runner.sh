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

# Stage order
declare -A NEXT_STAGE=(
    ["requirements"]="architecture"
    ["architecture"]="implement"
    ["implement"]="qa"
    ["qa"]=""  # Final stage
)

declare -A STAGE_COMMAND=(
    ["requirements"]="/workflow-requirements"
    ["architecture"]="/workflow-architecture"
    ["implement"]="/workflow-implement"
    ["qa"]="/workflow-qa"
)

declare -A STAGE_OUTPUT=(
    ["requirements"]="1-requirements.md"
    ["architecture"]="2-architecture.md"
    ["implement"]="3-implementation.md"
    ["qa"]="4-qa-report.md"
)

log() {
    echo -e "${BLUE}[agent-runner]${NC} $1"
}

success() {
    echo -e "${GREEN}[agent-runner]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[agent-runner]${NC} $1"
}

error() {
    echo -e "${RED}[agent-runner]${NC} $1"
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
    # Final stage - offer to create PR
    echo ""
    success "🎉 All stages complete for ${WORKFLOW_ID}!"
    echo ""
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

### Artifacts
- \`workflow/${WORKFLOW_ID}/1-requirements.md\`
- \`workflow/${WORKFLOW_ID}/2-architecture.md\`
- \`workflow/${WORKFLOW_ID}/3-implementation.md\`
- \`workflow/${WORKFLOW_ID}/4-qa-report.md\`

---
🤖 Generated by Workflow Agent System" || {
        warn "PR creation failed - you may need to create it manually"
    }

    echo ""
    success "Workflow ${WORKFLOW_ID} finished! PR created (or ready to create)."
    echo ""
    echo "Press Enter to close this pane..."
    read
fi
