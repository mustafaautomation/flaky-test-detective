## Real-World Use Cases

### 1. Nightly Flakiness Report
```bash
# After nightly test run
npx flaky-detective analyze test-results/*.xml -r console,html
```

### 2. Quarantine Flaky Tests
```bash
# Get grep pattern for quarantined tests
PATTERN=$(npx flaky-detective quarantine)
npx playwright test --grep-invert "$PATTERN"
```

### 3. CI Integration
```yaml
- name: Analyze flakiness
  run: npx flaky-detective analyze results.xml -r github
  # Posts report as PR comment
```
