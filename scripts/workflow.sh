#!/bin/bash

# Workflow Management Script
# Manages multi-agent workflows with git worktrees

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
WORKFLOW_DIR="$PROJECT_ROOT/workflow"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_usage() {
    echo "Usage: workflow.sh <command> [options]"
    echo ""
    echo "Commands:"
    echo "  create <ID> <type> <title>  Create new workflow (type: feature|bug|chore)"
    echo "  list                        List active workflows"
    echo "  status <ID>                 Show workflow status"
    echo "  next <ID>                   Show next stage to run"
    echo "  worktree <ID>               Create/show git worktree for workflow"
    echo "  clean <ID>                  Clean up completed workflow"
    echo ""
    echo "Examples:"
    echo "  workflow.sh create F001 feature 'Obsidian Integration'"
    echo "  workflow.sh list"
    echo "  workflow.sh status F001"
    echo "  workflow.sh worktree F001"
}

create_workflow() {
    local ID="$1"
    local TYPE="$2"
    local TITLE="$3"

    if [[ -z "$ID" || -z "$TYPE" || -z "$TITLE" ]]; then
        echo -e "${RED}Error: Missing arguments${NC}"
        echo "Usage: workflow.sh create <ID> <type> <title>"
        exit 1
    fi

    local WORKFLOW_PATH="$WORKFLOW_DIR/$ID"

    if [[ -d "$WORKFLOW_PATH" ]]; then
        echo -e "${YELLOW}Warning: Workflow $ID already exists${NC}"
        exit 1
    fi

    echo -e "${BLUE}Creating workflow: $ID - $TITLE${NC}"

    # Create workflow directory
    mkdir -p "$WORKFLOW_PATH"

    # Create status.json
    cat > "$WORKFLOW_PATH/status.json" << EOF
{
  "workflowId": "$ID",
  "type": "$TYPE",
  "title": "$TITLE",
  "createdAt": "$(date -Iseconds)",
  "currentStage": "requirements",
  "stages": {
    "requirements": {
      "status": "pending",
      "startedAt": null,
      "completedAt": null,
      "agent": null,
      "output": "1-requirements.md"
    },
    "architecture": {
      "status": "pending",
      "startedAt": null,
      "completedAt": null,
      "agent": null,
      "output": "2-architecture.md"
    },
    "implementation": {
      "status": "pending",
      "startedAt": null,
      "completedAt": null,
      "agent": null,
      "output": "3-implementation.md"
    },
    "qa": {
      "status": "pending",
      "startedAt": null,
      "completedAt": null,
      "agent": null,
      "output": "4-qa-report.md"
    },
    "integration-gate": {
      "status": "pending",
      "startedAt": null,
      "completedAt": null,
      "agent": null,
      "output": "5-integration-gate.md"
    }
  },
  "branch": "${TYPE}/${ID}",
  "worktree": "../war-goat-${ID,,}",
  "bugs": [],
  "notes": []
}
EOF

    echo -e "${GREEN}✓ Workflow created: $WORKFLOW_PATH${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Create worktree:  ./scripts/workflow.sh worktree $ID"
    echo "  2. Start Stage 1:    /workflow-requirements $ID"
}

list_workflows() {
    echo -e "${BLUE}Active Workflows${NC}"
    echo "================"

    if [[ ! -d "$WORKFLOW_DIR" ]] || [[ -z "$(ls -A "$WORKFLOW_DIR" 2>/dev/null | grep -v '^\.')" ]]; then
        echo "No active workflows"
        return
    fi

    printf "%-10s %-15s %-20s %-30s\n" "ID" "Stage" "Status" "Title"
    printf "%-10s %-15s %-20s %-30s\n" "----" "-----" "------" "-----"

    for dir in "$WORKFLOW_DIR"/*/; do
        if [[ -f "${dir}status.json" ]]; then
            local ID=$(basename "$dir")
            local STAGE=$(jq -r '.currentStage' "${dir}status.json")
            local STATUS=$(jq -r ".stages.$STAGE.status" "${dir}status.json")
            local TITLE=$(jq -r '.title' "${dir}status.json")
            printf "%-10s %-15s %-20s %-30s\n" "$ID" "$STAGE" "$STATUS" "${TITLE:0:30}"
        fi
    done
}

show_status() {
    local ID="$1"
    local WORKFLOW_PATH="$WORKFLOW_DIR/$ID"

    if [[ ! -f "$WORKFLOW_PATH/status.json" ]]; then
        echo -e "${RED}Error: Workflow $ID not found${NC}"
        exit 1
    fi

    echo -e "${BLUE}Workflow Status: $ID${NC}"
    echo "===================="

    local TITLE=$(jq -r '.title' "$WORKFLOW_PATH/status.json")
    local TYPE=$(jq -r '.type' "$WORKFLOW_PATH/status.json")
    local CREATED=$(jq -r '.createdAt' "$WORKFLOW_PATH/status.json")
    local CURRENT=$(jq -r '.currentStage' "$WORKFLOW_PATH/status.json")

    echo "Title:   $TITLE"
    echo "Type:    $TYPE"
    echo "Created: $CREATED"
    echo ""
    echo "Stages:"

    for stage in requirements architecture implementation qa integration-gate; do
        local STATUS=$(jq -r ".stages.$stage.status" "$WORKFLOW_PATH/status.json")
        local ICON="⬜"
        if [[ "$STATUS" == "completed" ]]; then
            ICON="✅"
        elif [[ "$STATUS" == "in_progress" ]]; then
            ICON="🔄"
        elif [[ "$STATUS" == "failed" ]]; then
            ICON="❌"
        fi

        local MARKER=""
        if [[ "$stage" == "$CURRENT" ]]; then
            MARKER=" ← current"
        fi

        printf "  %s %-15s %s%s\n" "$ICON" "$stage" "$STATUS" "$MARKER"
    done

    echo ""
    echo "Files:"
    ls -la "$WORKFLOW_PATH"/*.md 2>/dev/null || echo "  (no stage outputs yet)"
}

show_next() {
    local ID="$1"
    local WORKFLOW_PATH="$WORKFLOW_DIR/$ID"

    if [[ ! -f "$WORKFLOW_PATH/status.json" ]]; then
        echo -e "${RED}Error: Workflow $ID not found${NC}"
        exit 1
    fi

    local CURRENT=$(jq -r '.currentStage' "$WORKFLOW_PATH/status.json")
    local STATUS=$(jq -r ".stages.$CURRENT.status" "$WORKFLOW_PATH/status.json")

    echo -e "${BLUE}Next Step for $ID${NC}"
    echo ""

    case "$CURRENT" in
        requirements)
            echo "Run: /workflow-requirements $ID"
            ;;
        architecture)
            echo "Run: /workflow-architecture $ID"
            ;;
        implementation)
            echo "Run: /workflow-implement $ID"
            ;;
        qa)
            echo "Run: /workflow-qa $ID"
            ;;
    esac
}

setup_worktree() {
    local ID="$1"
    local WORKFLOW_PATH="$WORKFLOW_DIR/$ID"

    if [[ ! -f "$WORKFLOW_PATH/status.json" ]]; then
        echo -e "${RED}Error: Workflow $ID not found${NC}"
        exit 1
    fi

    local BRANCH=$(jq -r '.branch' "$WORKFLOW_PATH/status.json")
    local WORKTREE=$(jq -r '.worktree' "$WORKFLOW_PATH/status.json")
    local WORKTREE_PATH="$PROJECT_ROOT/$WORKTREE"

    echo -e "${BLUE}Setting up worktree for $ID${NC}"

    # Check if worktree already exists
    if [[ -d "$WORKTREE_PATH" ]]; then
        echo -e "${GREEN}Worktree already exists: $WORKTREE_PATH${NC}"
        echo ""
        echo "To use:"
        echo "  cd $WORKTREE_PATH"
        echo "  claude"
        return
    fi

    # Create worktree
    cd "$PROJECT_ROOT"
    git worktree add "$WORKTREE_PATH" -b "$BRANCH" 2>/dev/null || \
        git worktree add "$WORKTREE_PATH" "$BRANCH"

    echo -e "${GREEN}✓ Worktree created: $WORKTREE_PATH${NC}"
    echo ""
    echo "To use:"
    echo "  cd $WORKTREE_PATH"
    echo "  claude"
}

clean_workflow() {
    local ID="$1"
    local WORKFLOW_PATH="$WORKFLOW_DIR/$ID"

    if [[ ! -f "$WORKFLOW_PATH/status.json" ]]; then
        echo -e "${RED}Error: Workflow $ID not found${NC}"
        exit 1
    fi

    local WORKTREE=$(jq -r '.worktree' "$WORKFLOW_PATH/status.json")
    local WORKTREE_PATH="$PROJECT_ROOT/$WORKTREE"

    echo -e "${YELLOW}Cleaning up workflow: $ID${NC}"

    # Remove worktree if exists
    if [[ -d "$WORKTREE_PATH" ]]; then
        echo "Removing worktree: $WORKTREE_PATH"
        cd "$PROJECT_ROOT"
        git worktree remove "$WORKTREE_PATH" --force
    fi

    # Archive workflow
    local ARCHIVE_DIR="$WORKFLOW_DIR/_archive"
    mkdir -p "$ARCHIVE_DIR"
    mv "$WORKFLOW_PATH" "$ARCHIVE_DIR/$(date +%Y-%m-%d)-$ID"

    echo -e "${GREEN}✓ Workflow archived${NC}"
}

# Main command dispatch
case "${1:-}" in
    create)
        create_workflow "$2" "$3" "$4"
        ;;
    list)
        list_workflows
        ;;
    status)
        show_status "$2"
        ;;
    next)
        show_next "$2"
        ;;
    worktree)
        setup_worktree "$2"
        ;;
    clean)
        clean_workflow "$2"
        ;;
    *)
        print_usage
        exit 1
        ;;
esac
