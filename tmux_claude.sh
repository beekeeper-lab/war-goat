#!/bin/bash
#
# Start Claude inside a tmux session
#
# This ensures /start-workflow can create agent panes properly.
#
# Usage: ./tmux_claude.sh
#

SESSION_NAME="workflow"

# Check if tmux is installed
if ! command -v tmux &> /dev/null; then
    echo "tmux is not installed. Install it with:"
    echo "  sudo pacman -S tmux    # Arch"
    echo "  sudo apt install tmux  # Debian/Ubuntu"
    echo "  brew install tmux      # macOS"
    exit 1
fi

# Check if session already exists
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "Attaching to existing tmux session '$SESSION_NAME'..."
    exec tmux attach -t "$SESSION_NAME"
else
    echo "Starting new tmux session '$SESSION_NAME' with Claude..."
    exec tmux new-session -s "$SESSION_NAME" "claude"
fi
