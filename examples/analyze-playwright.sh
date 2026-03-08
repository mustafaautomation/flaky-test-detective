#!/bin/bash
# Analyze Playwright test results for flakiness
# Run this after generating test results with: npx playwright test --reporter=json

# Single run
npx flaky-detective analyze ./test-results/results.json

# Multiple runs (more data = better detection)
npx flaky-detective analyze ./results/run-1.json ./results/run-2.json ./results/run-3.json

# Generate HTML report
npx flaky-detective analyze ./test-results/results.json --reporter html,console

# Get quarantine pattern for Playwright
QUARANTINE=$(npx flaky-detective quarantine)
if [ -n "$QUARANTINE" ]; then
  echo "Running tests excluding quarantined..."
  npx playwright test --grep-invert "$QUARANTINE"
fi
