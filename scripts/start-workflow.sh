#!/bin/bash
#
# Start Workflow - Creates worktree and spawns agent in tmux pane
#
# Usage: start-workflow.sh <workflow-id> <type> <title>
#
# Example:
#   start-workflow.sh F003 feature "GitHub Repository Enrichment"
#

set -e

WORKFLOW_ID="$1"
TYPE="$2"
TITLE="$3"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PROJECT_NAME="$(basename "$PROJECT_ROOT")"

log() { echo -e "${BLUE}[start-workflow]${NC} $1"; }
success() { echo -e "${GREEN}[start-workflow]${NC} $1"; }
warn() { echo -e "${YELLOW}[start-workflow]${NC} $1"; }
error() { echo -e "${RED}[start-workflow]${NC} $1"; exit 1; }

# Validate inputs
if [ -z "$WORKFLOW_ID" ]; then
    error "Usage: start-workflow.sh <workflow-id> <type> <title>"
fi

# Default type and title if not provided
TYPE="${TYPE:-feature}"
TITLE="${TITLE:-$WORKFLOW_ID}"

# Determine branch name based on type
case "$TYPE" in
    feature) BRANCH_PREFIX="feature" ;;
    bug)     BRANCH_PREFIX="fix" ;;
    chore|task) BRANCH_PREFIX="chore" ;;
    *) BRANCH_PREFIX="feature" ;;
esac

BRANCH_NAME="${BRANCH_PREFIX}/${WORKFLOW_ID}"
WORKTREE_PATH="${PROJECT_ROOT}/../${PROJECT_NAME}-${WORKFLOW_ID,,}"

log "Starting workflow: ${WORKFLOW_ID}"
log "Type: ${TYPE}"
log "Title: ${TITLE}"
log "Branch: ${BRANCH_NAME}"
log "Worktree: ${WORKTREE_PATH}"

# Check if we're in tmux
if [ -z "$TMUX" ]; then
    log "Not running in tmux - starting tmux session 'workflow'..."

    # Check if workflow session already exists
    if tmux has-session -t workflow 2>/dev/null; then
        log "Attaching to existing 'workflow' session..."
        exec tmux attach -t workflow \; send-keys "$0 $*" Enter
    else
        # Start new tmux session and run this script inside it
        exec tmux new-session -s workflow "$0 $*"
    fi
fi

IN_TMUX=true

# Step 1: Create workflow directory (if not exists)
log "Creating workflow directory..."
"$SCRIPT_DIR/workflow.sh" create "$WORKFLOW_ID" "$TYPE" "$TITLE" 2>/dev/null || {
    warn "Workflow may already exist, continuing..."
}

# Step 2: Create git worktree
log "Creating git worktree..."
cd "$PROJECT_ROOT"

# Check if worktree already exists
if [ -d "$WORKTREE_PATH" ]; then
    warn "Worktree already exists at ${WORKTREE_PATH}"
else
    # Create branch if it doesn't exist
    if ! git show-ref --verify --quiet "refs/heads/${BRANCH_NAME}"; then
        log "Creating branch ${BRANCH_NAME}..."
        git branch "$BRANCH_NAME"
    fi

    # Create worktree
    git worktree add "$WORKTREE_PATH" "$BRANCH_NAME"
    success "Worktree created at ${WORKTREE_PATH}"
fi

# Step 3: Copy workflow directory to worktree (if not there)
if [ ! -d "${WORKTREE_PATH}/workflow/${WORKFLOW_ID}" ]; then
    log "Copying workflow files to worktree..."
    mkdir -p "${WORKTREE_PATH}/workflow"
    cp -r "${PROJECT_ROOT}/workflow/${WORKFLOW_ID}" "${WORKTREE_PATH}/workflow/"
fi

# Step 4: Launch agent in tmux pane
log "Launching agent in new tmux pane..."

# Create new pane and run agent
tmux split-window -h -c "$WORKTREE_PATH" \
    "${SCRIPT_DIR}/agent-runner.sh ${WORKFLOW_ID} requirements ${WORKTREE_PATH}"

# Name the pane
tmux select-pane -T "${WORKFLOW_ID}"

success "Agent launched in tmux pane!"
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Workflow ${WORKFLOW_ID} started!                            ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  • Agent is running in the pane to the right                 ║"
echo "║  • Switch panes: Ctrl+b → (arrow keys)                       ║"
echo "║  • If agent has questions, answer in its pane                ║"
echo "║  • Stages auto-chain: req → arch → impl → qa → PR            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Monitor status:"
echo "  beans list"
echo "  ./scripts/workflow.sh status ${WORKFLOW_ID}"
echo ""
