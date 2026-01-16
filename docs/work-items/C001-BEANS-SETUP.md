# Chore: Beans Issue Tracking Setup

> **ID**: C001
> **Type**: Chore
> **Status**: In Progress
> **Priority**: Medium
> **Effort**: S
> **Created**: 2026-01-16

## Overview

Set up Beans as the issue tracking layer for War Goat, integrating it with the multi-agent workflow system per ADR-003.

---

## Tasks

### Setup Tasks

- [x] Install Beans CLI (`go install github.com/hmans/beans@latest`)
- [x] Initialize Beans in project (`beans init`)
- [ ] Add beans to PATH or create alias
- [ ] Configure .beans.yml if needed
- [ ] Add .beans/ to .gitignore (or keep tracked)

### Integration Tasks

- [ ] Update ADR-003 to reflect Go installation (not npm)
- [ ] Create initial issues from existing work items (F001-F005, T001-T003)
- [ ] Test `beans prime` output for agent context
- [ ] Document Beans workflow in MULTI-AGENT-WORKFLOW.md

### Documentation Tasks

- [ ] Update SESSION-STATUS.md with Beans status
- [ ] Add Beans commands to workflow quick reference

---

## Beans Quick Reference

```bash
# List all issues
beans list

# Create new issue
beans create --type feature --title "New feature"
beans create --type bug --title "Bug description"

# Show issue details
beans show F001

# Archive completed issues
beans archive

# Get AI agent context
beans prime

# Interactive TUI
beans tui
```

---

## Configuration

Default `.beans.yml` options to consider:

```yaml
# .beans.yml
statuses:
  - backlog
  - in-progress
  - review
  - done
  - archived

types:
  - feature
  - bug
  - chore

priorities:
  - low
  - medium
  - high
  - critical
```

---

## Verification

- [ ] `beans list` works
- [ ] `beans create` creates issue in .beans/
- [ ] `beans prime` outputs useful context
- [ ] Issues integrate with workflow.sh

---

## Notes

- Beans is a Go CLI tool, not npm package (ADR-003 needs correction)
- Installed to ~/go/bin/beans, symlinked to ~/.local/bin/beans
- Project initialized with `beans init` on 2026-01-16
