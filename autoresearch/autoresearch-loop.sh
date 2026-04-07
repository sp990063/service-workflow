#!/usr/bin/env bash
# Autoresearch Loop Wrapper for free-code
# Usage: ./autoresearch-loop.sh [iterations] [--plan-only]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/AUTORESEARCH_CONFIG.md"
RESULTS_FILE="$SCRIPT_DIR/../autoresearch-results.tsv"
ITERATIONS="${1:-10}"
PLAN_ONLY="${2:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

log() { printf "${CYAN}[*]${RESET} %s\n" "$*"; }
ok()   { printf "${GREEN}[+]${RESET} %s\n" "$*"; }
warn() { printf "${YELLOW}[!]${RESET} %s\n" "$*"; }
fail() { printf "${RED}[x]${RESET} %s\n" "$*"; }

header() {
  echo ""
  printf "${BOLD}${CYAN}"
  cat << 'ART'
  ╔═══════════════════════════════════════════════╗
  ║     Autoresearch Loop - free-code Edition     ║
  ╚═══════════════════════════════════════════════╝
ART
  printf "${RESET}"
  echo ""
}

# ─────────────────────────────────────────────────────────
# Load config
# ─────────────────────────────────────────────────────────
load_config() {
  if [[ ! -f "$CONFIG_FILE" ]]; then
    fail "Config file not found: $CONFIG_FILE"
    exit 1
  fi

  GOAL=$(grep -A1 "^## GOAL$" "$CONFIG_FILE" | tail -1 | sed 's/^#*[[:space:]]*//')
  METRIC=$(grep -A1 "^## METRIC$" "$CONFIG_FILE" | tail -1 | sed 's/^#*[[:space:]]*//')
  VERIFY_CMD=$(grep -A1 "^## VERIFY COMMAND$" "$CONFIG_FILE" | tail -1 | sed 's/^#*[[:space:]]*//')
  BASELINE_CMD=$(grep -A1 "^## BASELINE" "$CONFIG_FILE" | tail -1 | sed 's/^#*[[:space:]]*//')
  SCOPE_RW=$(grep -A20 "^## SCOPE (Read-Write)" "$CONFIG_FILE" | grep -v "SCOPE" | grep -v "^$" | grep -v "^#" | sed 's/^#*[[:space:]]*//')
  PROBLEM_CONTEXT=$(grep -A30 "^## PROBLEM CONTEXT" "$CONFIG_FILE" | tail -n +2 | sed '/^## /q' | head -n -1 | sed 's/^#*[[:space:]]*//')

  ok "Config loaded"
  log "Goal: $GOAL"
  log "Iterations: $ITERATIONS"
}

# ─────────────────────────────────────────────────────────
# Ensure results TSV exists
# ─────────────────────────────────────────────────────────
init_results() {
  if [[ ! -f "$RESULTS_FILE" ]]; then
    printf "iteration\tdate\ttime\tstatus\tchange_summary\ttests_passed\ttests_failed\n" > "$RESULTS_FILE"
    ok "Created results file: $RESULTS_FILE"
  fi
}

# ─────────────────────────────────────────────────────────
# Run verification
# ─────────────────────────────────────────────────────────
run_verify() {
  local iteration="$1"
  log "Running verification (iteration #$iteration)..."

  cd /home/cwlai/.openclaw/workspace/service-workflow

  # Capture output and exit code
  local output exit_code
  output=$(eval "$VERIFY_CMD" 2>&1) && exit_code=0 || exit_code=$?

  # Count pass/fail from output
  local passed failed
  if [[ -n "$output" ]]; then
    # Try to parse playwright output
    if echo "$output" | grep -q "failed"; then
      failed=$(echo "$output" | grep -o "[0-9]* failed" | grep -o "[0-9]*" | head -1)
    else
      failed=0
    fi
    if echo "$output" | grep -q "passed"; then
      passed=$(echo "$output" | grep -o "[0-9]* passed" | grep -o "[0-9]*" | head -1)
    else
      passed=0
    fi
  fi

  echo "$output" | tail -10

  printf "\n%s\n%s\n%s\n" "$output" "EXIT_CODE=$exit_code" "PASSED=${passed:-0}" "FAILED=${failed:-0}" > /tmp/autoresearch_verify_$iteration.txt

  return $exit_code
}

# ─────────────────────────────────────────────────────────
# Get current changes summary
# ─────────────────────────────────────────────────────────
get_changes_summary() {
  cd /home/cwlai/.openclaw/workspace/service-workflow
  if git diff --stat | grep -v "^$" | tail -5; then
    git diff --stat
  else
    echo "No changes"
  fi
}

# ─────────────────────────────────────────────────────────
# Generate next iteration prompt
# ─────────────────────────────────────────────────────────
generate_prompt() {
  local iteration="$1"
  local prev_output="${2:-}"

  cat << PROMPT
# Autoresearch Iteration #$iteration

## Your Role
You are improving E2E tests for a Service Workflow platform. You MUST follow the loop strictly.

## GOAL
$GOAL

## Problem Context
$PROBLEM_CONTEXT

## Current Files in Scope (Read-Write)
$SCOPE_RW

## What to Do (ONE change only)
Based on the failing tests and previous attempts, identify ONE specific, focused change that could improve the situation.

Options:
- Fix a specific timing issue in the workflow advance logic
- Adjust test assertions to match actual behavior
- Add explicit waits for backend state persistence
- Fix condition evaluation timing
- Adjust the 300ms setTimeout if that's causing race conditions

## Rules
1. ONE focused change per iteration
2. Read relevant files BEFORE modifying
3. Make the smallest change that could help
4. Run verification immediately after

## Verification
After making your change:
1. \`cd /home/cwlai/.openclaw/workspace/service-workflow && git add -A && git commit -m "experiment: iteration #$iteration"\`
2. Run: \`cd /home/cwlai/.openclaw/workspace/service-workflow && npx playwright test --grep "SCN-IT|SCN-REVIEW" 2>&1\`
3. If tests pass → keep the change
4. If tests fail → \`git revert HEAD --no-edit\` and report failure

## Important
- Do NOT change business logic (form builder, workflow designer, etc.)
- Do NOT change UI components
- Focus ONLY on workflow instance advancement logic and test assertions
- If stuck, make a smaller/different change

Start now. Make ONE change, verify, and report result.
PROMPT
}

# ─────────────────────────────────────────────────────────
# Run one iteration
# ─────────────────────────────────────────────────────────
run_iteration() {
  local iteration="$1"
  local prompt

  log "═══ Iteration #$iteration ═══"

  # Check for plan-only mode
  if [[ "${PLAN_ONLY:-}" == "--plan-only" ]]; then
    prompt=$(generate_prompt "$iteration" "")
    printf "\n%s\n" "$prompt"
    return 0
  fi

  cd /home/cwlai/.openclaw/workspace/service-workflow

  # Check git status
  if [[ -n "$(git status --porcelain)" ]]; then
    warn "Working tree is dirty. Committing or stashing..."
    git stash 2>/dev/null || true
  fi

  # Generate prompt
  prompt=$(generate_prompt "$iteration" "")

  # Run free-code
  log "Running free-code..."
  local fc_output fc_exit
  fc_output=$(ANTHROPIC_AUTH_TOKEN="sk-cp-itVvdJBvAsuFr8-cJZQi_kJWWv4yCKa6kzlqUiqeVOEkwQovRAR_FiI1AsVAOUW948nozibc95kL4ns9dTRH3ar80RqmdUu5HjhldAVq1Q7DEuj-TaVg7TM" \
    ANTHROPIC_BASE_URL="https://api.minimaxi.com/anthropic" \
    /home/cwlai/.openclaw/workspace/free-code/cli \
    -p "$prompt" \
    --model MiniMax-M2.7 \
    --no-session-persistence \
    --dangerously-skip-permissions \
    --bare \
    2>&1) && fc_exit=0 || fc_exit=$?

  echo "$fc_output" | tail -20

  if [[ $fc_exit -ne 0 ]]; then
    warn "free-code exited with code $fc_exit"
  fi

  # Check if there are changes
  if [[ -n "$(git status --porcelain)" ]]; then
    log "Changes detected. Committing..."
    git add -A
    git commit -m "experiment: iteration #$iteration" 2>/dev/null || true

    # Run verification
    if run_verify "$iteration"; then
      ok "Iteration #$iteration: SUCCESS"
      log_result "$iteration" "PASS" "$(get_changes_summary)" "1" "0"
      return 0
    else
      warn "Iteration #$iteration: FAILED - reverting"
      git revert HEAD --no-edit 2>/dev/null || true
      log_result "$iteration" "FAIL" "$(get_changes_summary)" "0" "1"
      return 1
    fi
  else
    warn "No changes made by free-code"
    log_result "$iteration" "NOCHANGE" "No changes" "0" "0"
    return 0
  fi
}

# ─────────────────────────────────────────────────────────
# Log result to TSV
# ─────────────────────────────────────────────────────────
log_result() {
  local iteration="$1"
  local status="$2"
  local summary="$3"
  local passed="${4:-0}"
  local failed="${5:-0}"

  local date time
  date=$(date +"%Y-%m-%d")
  time=$(date +"%H:%M:%S")

  # Escape tabs in summary
  summary=$(printf '%s' "$summary" | tr '\t' ' ' | tr '\n' ' ')

  printf "%s\t%s\t%s\t%s\t%s\t%s\t%s\n" \
    "$iteration" "$date" "$time" "$status" "$summary" "$passed" "$failed" \
    >> "$RESULTS_FILE"

  ok "Logged to $RESULTS_FILE"
}

# ─────────────────────────────────────────────────────────
# Run baseline
# ─────────────────────────────────────────────────────────
run_baseline() {
  log "═══ Baseline Measurement ═══"
  cd /home/cwlai/.openclaw/workspace/service-workflow

  if [[ -n "$(git status --porcelain)" ]]; then
    git stash 2>/dev/null || true
  fi

  local output exit_code
  output=$(eval "$VERIFY_CMD" 2>&1) && exit_code=0 || exit_code=$?

  echo "$output" | tail -15

  local passed=0 failed=0
  if echo "$output" | grep -q "failed"; then
    failed=$(echo "$output" | grep -o "[0-9]* failed" | grep -o "[0-9]*" | head -1)
  fi
  if echo "$output" | grep -q "passed"; then
    passed=$(echo "$output" | grep -o "[0-9]* passed" | grep -o "[0-9]*" | head -1)
  fi

  log_result "0" "BASELINE" "Before any changes" "${passed:-0}" "${failed:-0}"

  if [[ $exit_code -eq 0 ]]; then
    ok "Baseline: ALL TESTS PASSING"
  else
    warn "Baseline: Some tests failing"
  fi
}

# ─────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────
main() {
  header
  load_config
  init_results
  run_baseline

  if [[ "${PLAN_ONLY:-}" == "--plan-only" ]]; then
    log "Plan-only mode: showing next prompt only"
    generate_prompt 1 ""
    exit 0
  fi

  local success=0
  local fail=0

  for i in $(seq 1 "$ITERATIONS"); do
    if run_iteration "$i"; then
      ((success++))
    else
      ((fail++))
    fi
    echo ""
  done

  echo ""
  printf "${BOLD}${GREEN}═══ Autoresearch Complete ═══${RESET}\n"
  printf "  Successful iterations: %s\n" "$success"
  printf "  Failed iterations:     %s\n" "$fail"
  printf "  Results logged to:     %s\n" "$RESULTS_FILE"
  echo ""
}

main "$@"
