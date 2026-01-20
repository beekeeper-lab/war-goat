#!/usr/bin/env python3
"""
Write Safety Hook for Claude Code

Blocks writes to sensitive files:
1. .env files (secrets)
2. SSH keys and config
3. System files (/etc)
4. Other credential files
"""
import json
import sys
import os


def main():
    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError:
        sys.exit(0)  # Allow on parse error

    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})
    file_path = tool_input.get("file_path", "")

    # Only check Write and Edit tools
    if tool_name not in ["Write", "Edit"]:
        sys.exit(0)

    # Normalize path for checking
    normalized_path = os.path.normpath(file_path)
    basename = os.path.basename(file_path)

    # === HARD BLOCKS (always blocked) ===
    hard_blocked_patterns = [
        # SSH files
        ("/.ssh/", "BLOCKED: Cannot write to SSH directory"),
        ("/.ssh", "BLOCKED: Cannot write to SSH directory"),

        # System files
        ("/etc/", "BLOCKED: Cannot write to system config directory"),
        ("/etc", "BLOCKED: Cannot write to system config directory"),

        # Root home
        ("/root/", "BLOCKED: Cannot write to root home directory"),

        # AWS credentials
        ("/.aws/credentials", "BLOCKED: Cannot write to AWS credentials"),
        ("/.aws/config", "BLOCKED: Cannot write to AWS config"),

        # Other sensitive locations
        ("/.gnupg/", "BLOCKED: Cannot write to GPG directory"),
        ("/.gitconfig", "BLOCKED: Cannot write to global git config"),
    ]

    for pattern, message in hard_blocked_patterns:
        if pattern in normalized_path or pattern in file_path:
            print(message, file=sys.stderr)
            sys.exit(2)

    # === ENV FILE PROTECTION ===
    env_patterns = [
        ".env",
        ".env.local",
        ".env.production",
        ".env.staging",
        ".env.development",
    ]

    if basename in env_patterns or basename.startswith(".env"):
        print(f"BLOCKED: Cannot write to environment file ({basename}). These often contain secrets.", file=sys.stderr)
        sys.exit(2)

    # === KEY FILE PROTECTION ===
    key_extensions = [".pem", ".key", ".p12", ".pfx"]
    if any(file_path.endswith(ext) for ext in key_extensions):
        print(f"BLOCKED: Cannot write to key/certificate file ({basename})", file=sys.stderr)
        sys.exit(2)

    # === CREDENTIALS FILE PROTECTION ===
    credential_names = [
        "credentials",
        "credentials.json",
        "secrets.json",
        "secrets.yaml",
        "secrets.yml",
        "private_key",
        "id_rsa",
        "id_ed25519",
        "id_ecdsa",
    ]

    if basename.lower() in credential_names:
        print(f"BLOCKED: Cannot write to credentials file ({basename})", file=sys.stderr)
        sys.exit(2)

    sys.exit(0)  # Allow the write


if __name__ == "__main__":
    main()
