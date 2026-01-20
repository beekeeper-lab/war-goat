## Summary

<!-- Brief description of what this PR does (1-3 sentences) -->

## Type of Change

<!-- Check the relevant option(s) -->

- [ ] Feature (new functionality)
- [ ] Bug fix (non-breaking fix for an issue)
- [ ] Refactor (code change that neither fixes a bug nor adds a feature)
- [ ] Documentation (changes to docs only)
- [ ] Chore (maintenance, dependencies, config)
- [ ] Workflow (changes to multi-agent workflow system)

## Risk Level

<!-- Check ONE that best describes the risk of this change -->

- [ ] **Low** - Isolated change, minimal blast radius, easy to revert
- [ ] **Medium** - Affects multiple components or has integration points
- [ ] **High** - Core functionality, breaking changes, or affects critical paths
- [ ] **Critical** - Infrastructure, CI/CD, security, or data integrity

## Areas Affected

<!-- Check all that apply -->

- [ ] Frontend (src/, React components)
- [ ] Backend (server/, API)
- [ ] Workflow System (scripts/, .claude/)
- [ ] Configuration (package.json, *.config.*)
- [ ] Documentation (docs/)
- [ ] CI/CD (.github/workflows/)
- [ ] Database/Data (db.json, data/)

## Testing Evidence

<!-- Describe how this was tested. Include test output if possible. -->

### Automated Tests
```
<!-- Paste test output here, e.g., npm run test output -->
```

### Manual Testing
<!-- Describe any manual testing performed -->

- [ ] Ran locally and verified functionality
- [ ] Tested edge cases: <!-- list them -->

## Workflow Artifacts (if from multi-agent workflow)

<!-- If this PR was created by the workflow system, link to artifacts -->

- Work Item ID: <!-- e.g., F001, B002 -->
- [ ] Requirements: `workflow/{ID}/1-requirements.md`
- [ ] Architecture: `workflow/{ID}/2-architecture.md`
- [ ] Implementation: `workflow/{ID}/3-implementation.md`
- [ ] QA Report: `workflow/{ID}/4-qa-report.md`
- [ ] Integration Gate: `workflow/{ID}/5-integration-gate.md`

## Pre-Merge Checklist

<!-- Ensure these are done before requesting review -->

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Tests pass locally (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Documentation updated (if needed)
- [ ] No sensitive data (secrets, credentials, PII) included

## Reviewer Notes

<!-- Any specific areas to focus on, known limitations, or concerns -->

---

<!--
Labels to add (if applicable):
- `workflow-ready` - PR is ready for automated merge session
- `session:YYYY-MM-DD` - Group PRs by work session date
- `breaking-change` - Contains breaking changes
- `needs-docs` - Documentation update required
- `needs-migration` - Database/data migration required
-->
