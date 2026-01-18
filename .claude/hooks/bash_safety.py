#!/usr/bin/env python3
"""
Bash Safety Hook for Claude Code

Blocks dangerous bash commands:
1. Git pushes/merges to main branch
2. Force pushes
3. Dangerous rm -rf commands
4. rm commands (requires explicit approval)
5. Piping curl/wget to bash (remote code execution)
"""
import json
import sys
import re


def main():
    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError:
        sys.exit(0)  # Allow on parse error

    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})
    command = tool_input.get("command", "")

    if tool_name != "Bash":
        sys.exit(0)

    # === HARD BLOCKS (always blocked, no exceptions) ===
    hard_blocks = [
        # Catastrophic rm commands
        (r"rm\s+(-[rf]+\s+)*/([\s;|&]|$)", "BLOCKED: Cannot delete root filesystem"),
        (r"rm\s+(-[rf]+\s+)*~([\s;|&/]|$)", "BLOCKED: Cannot delete home directory"),
        (r"rm\s+(-[rf]+\s+)*\$HOME", "BLOCKED: Cannot delete home directory"),
        (r"rm\s+-rf\s+\.([\s;|&]|$)", "BLOCKED: Cannot recursively delete current directory"),

        # Remote code execution
        (r"curl\s+.*\|\s*(ba)?sh", "BLOCKED: Cannot pipe curl to shell (security risk)"),
        (r"wget\s+.*\|\s*(ba)?sh", "BLOCKED: Cannot pipe wget to shell (security risk)"),
        (r"curl\s+.*&&\s*(ba)?sh", "BLOCKED: Cannot download and execute scripts"),
        (r"wget\s+.*&&\s*(ba)?sh", "BLOCKED: Cannot download and execute scripts"),

        # Git to main/master protection
        (r"git\s+push\s+(-[^\s]+\s+)*origin\s+main([\s;|&]|$)", "BLOCKED: Cannot push directly to main. Use a PR instead."),
        (r"git\s+push\s+(-[^\s]+\s+)*origin\s+master([\s;|&]|$)", "BLOCKED: Cannot push directly to master. Use a PR instead."),
        (r"git\s+push\s+--force", "BLOCKED: Force push is disabled for safety"),
        (r"git\s+push\s+-f\s+", "BLOCKED: Force push is disabled for safety"),
        (r"git\s+merge\s+.*\s+main([\s;|&]|$)", "BLOCKED: Cannot merge to main directly"),
        (r"git\s+merge\s+.*\s+master([\s;|&]|$)", "BLOCKED: Cannot merge to master directly"),
    ]

    for pattern, message in hard_blocks:
        if re.search(pattern, command, re.IGNORECASE):
            print(message, file=sys.stderr)
            sys.exit(2)

    # === SOFT BLOCKS (blocked but can be overridden) ===
    # rm commands that aren't obviously safe
    safe_rm_patterns = [
        r"rm\s+(-[rf]+\s+)*(node_modules|dist|build|\.cache|__pycache__|\.pytest_cache|coverage|\.nyc_output|\.next|\.nuxt)",
        r"rm\s+(-[rf]+\s+)*\*\.(log|tmp|bak|swp)",
        r"rm\s+[^-]",  # rm without flags on a single file is usually safe
    ]

    if re.search(r"\brm\s+", command):
        is_safe = any(re.search(p, command, re.IGNORECASE) for p in safe_rm_patterns)
        if not is_safe:
            print("BLOCKED: rm command requires explicit approval. If you need to delete files, please confirm.", file=sys.stderr)
            sys.exit(2)

    # === WARNINGS (allow but log) ===
    # git reset --hard (loses uncommitted work)
    if re.search(r"git\s+reset\s+--hard", command, re.IGNORECASE):
        # Allow but could log to audit file if desired
        pass

    sys.exit(0)  # Allow the command


if __name__ == "__main__":
    main()
