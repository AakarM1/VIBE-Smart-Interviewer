#!/bin/bash
set -euo pipefail

# Git Branch Sync Automation Script
# Safely merges commits from important upstream branches into target branch
# Usage: bash tools/sync_branch.sh <REMOTE> <TARGET_BRANCH> [--include-low-ahead]

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Configuration
REMOTE="${1:-origin}"
TARGET_BRANCH="${2:-$(git branch --show-current)}"
INCLUDE_LOW_AHEAD="false"
PRIORITY_BASES=("main" "master" "dev")
EXCLUDE_PREFIXES=("dependabot/" "renovate/")
MIN_AHEAD_THRESHOLD=5

# Parse arguments
if [[ "${3:-}" == "--include-low-ahead" ]]; then
    INCLUDE_LOW_AHEAD="true"
fi

# Validate inputs
if [[ -z "$TARGET_BRANCH" ]]; then
    echo -e "${RED}Error: Could not determine target branch${NC}"
    echo "Usage: $0 <REMOTE> <TARGET_BRANCH> [--include-low-ahead]"
    exit 1
fi

# Output arrays for reporting
MERGED_BRANCHES=()
SKIPPED_BRANCHES=()
CONFLICT_BRANCHES=()
COMMANDS_EXECUTED=()

# Helper functions
log_header() {
    echo -e "\n${BOLD}${BLUE}=== $1 ===${NC}"
}

log_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

log_error() {
    echo -e "${RED}✗ $1${NC}"
}

log_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

execute_command() {
    local cmd="$1"
    local description="$2"
    echo -e "${BLUE}Running: ${NC}$cmd"
    COMMANDS_EXECUTED+=("$cmd")
    eval "$cmd" || {
        log_error "Command failed: $cmd"
        return 1
    }
}

should_exclude_branch() {
    local branch="$1"
    for prefix in "${EXCLUDE_PREFIXES[@]}"; do
        if [[ "$branch" == "$prefix"* ]]; then
            return 0  # true - should exclude
        fi
    done
    return 1  # false - should not exclude
}

is_priority_branch() {
    local branch="$1"
    for priority in "${PRIORITY_BASES[@]}"; do
        if [[ "$branch" == "$priority" ]]; then
            return 0  # true - is priority
        fi
    done
    return 1  # false - not priority
}

get_commit_counts() {
    local target="$1"
    local remote_branch="$2"
    
    # Check if remote branch exists
    if ! git rev-parse --verify "remotes/$REMOTE/$remote_branch" >/dev/null 2>&1; then
        echo "0 0"
        return
    fi
    
    local ahead_count behind_count
    ahead_count=$(git rev-list --count "$target..remotes/$REMOTE/$remote_branch" 2>/dev/null || echo "0")
    behind_count=$(git rev-list --count "remotes/$REMOTE/$remote_branch..$target" 2>/dev/null || echo "0")
    
    echo "$ahead_count $behind_count"
}

get_merge_base() {
    local target="$1"
    local remote_branch="$2"
    
    if ! git rev-parse --verify "remotes/$REMOTE/$remote_branch" >/dev/null 2>&1; then
        echo ""
        return
    fi
    
    git merge-base "$target" "remotes/$REMOTE/$remote_branch" 2>/dev/null || echo ""
}

perform_dry_run_merge() {
    local remote_branch="$1"
    local temp_branch="sync-test-$(date +%s)"
    
    # Create temporary branch for testing
    git checkout -b "$temp_branch" >/dev/null 2>&1
    
    # Attempt merge
    local merge_result=0
    git merge --no-commit --no-ff "remotes/$REMOTE/$remote_branch" >/dev/null 2>&1 || merge_result=$?
    
    # Check for conflicts
    local has_conflicts=false
    if [[ $merge_result -ne 0 ]] || git diff --name-only --diff-filter=U | grep -q .; then
        has_conflicts=true
    fi
    
    # Clean up
    git merge --abort >/dev/null 2>&1 || true
    git checkout "$TARGET_BRANCH" >/dev/null 2>&1
    git branch -D "$temp_branch" >/dev/null 2>&1
    
    if [[ "$has_conflicts" == "true" ]]; then
        return 1
    else
        return 0
    fi
}

# Main execution starts here
log_header "Git Branch Sync Report - $(date)"

echo "Target Branch: $TARGET_BRANCH"
echo "Remote: $REMOTE"
echo "Include Low Ahead: $INCLUDE_LOW_AHEAD"
echo "Priority Bases: ${PRIORITY_BASES[*]}"
echo "Exclude Prefixes: ${EXCLUDE_PREFIXES[*]}"

# Store initial state
INITIAL_SHA=$(git rev-parse HEAD)
echo "Initial HEAD: $INITIAL_SHA"

log_header "1. Repository Scan"

# Enable rerere for conflict resolution memory
execute_command "git config rerere.enabled true" "Enable rerere for conflict resolution"

# Fetch all remote refs
execute_command "git fetch --all --prune" "Fetch all remote refs"

# Verify target branch exists
if ! git show-ref --verify --quiet "refs/heads/$TARGET_BRANCH"; then
    log_error "Local branch '$TARGET_BRANCH' does not exist"
    exit 1
fi

# Ensure we're on target branch
execute_command "git checkout $TARGET_BRANCH" "Checkout target branch"

# Fast-forward target branch if possible
if git rev-parse --verify "remotes/$REMOTE/$TARGET_BRANCH" >/dev/null 2>&1; then
    ff_result=0
    execute_command "git merge --ff-only remotes/$REMOTE/$TARGET_BRANCH" "Fast-forward target branch" || ff_result=$?
    if [[ $ff_result -eq 0 ]]; then
        log_success "Target branch fast-forwarded to match remote"
    else
        log_warning "Could not fast-forward target branch (may have local commits)"
    fi
else
    log_warning "Remote tracking branch $REMOTE/$TARGET_BRANCH does not exist"
fi

# Get list of all remote branches
log_info "Scanning remote branches..."
ALL_REMOTE_BRANCHES=($(git branch -r | grep "$REMOTE/" | grep -v " -> " | sed "s/.*$REMOTE\///"))

echo "Found ${#ALL_REMOTE_BRANCHES[@]} remote branches:"
for branch in "${ALL_REMOTE_BRANCHES[@]}"; do
    echo "  - $branch"
done

# Analyze divergence for each branch
log_header "2. Divergence Analysis"

declare -A BRANCH_AHEAD_COUNT
declare -A BRANCH_BEHIND_COUNT
declare -A BRANCH_MERGE_BASE

CANDIDATES_TO_MERGE=()

for branch in "${ALL_REMOTE_BRANCHES[@]}"; do
    # Skip target branch itself
    if [[ "$branch" == "$TARGET_BRANCH" ]]; then
        continue
    fi
    
    # Check if should exclude
    if should_exclude_branch "$branch"; then
        log_info "Skipping excluded branch: $branch"
        continue
    fi
    
    # Get commit counts
    read -r ahead_count behind_count <<< "$(get_commit_counts "$TARGET_BRANCH" "$branch")"
    merge_base=$(get_merge_base "$TARGET_BRANCH" "$branch")
    
    BRANCH_AHEAD_COUNT["$branch"]=$ahead_count
    BRANCH_BEHIND_COUNT["$branch"]=$behind_count
    BRANCH_MERGE_BASE["$branch"]=$merge_base
    
    echo "Branch: $branch"
    echo "  Ahead: $ahead_count, Behind: $behind_count"
    echo "  Merge base: ${merge_base:0:8}"
    
    # Determine if should include in merge candidates
    if [[ $ahead_count -gt 0 ]]; then
        if is_priority_branch "$branch"; then
            log_info "Adding priority branch to merge candidates: $branch ($ahead_count ahead)"
            CANDIDATES_TO_MERGE+=("$branch")
        elif [[ "$INCLUDE_LOW_AHEAD" == "true" ]] || [[ $ahead_count -ge $MIN_AHEAD_THRESHOLD ]]; then
            log_info "Adding branch to merge candidates: $branch ($ahead_count ahead)"
            CANDIDATES_TO_MERGE+=("$branch")
        else
            log_info "Skipping low-ahead branch: $branch ($ahead_count ahead, threshold: $MIN_AHEAD_THRESHOLD)"
            SKIPPED_BRANCHES+=("$branch (low ahead: $ahead_count)")
        fi
    else
        log_info "Skipping up-to-date branch: $branch"
        SKIPPED_BRANCHES+=("$branch (up-to-date)")
    fi
done

log_header "3. Merge Plan and Execution"

# Sort candidates: priority branches first, then by ahead count descending
SORTED_CANDIDATES=()

# Add priority branches first (in order)
for priority in "${PRIORITY_BASES[@]}"; do
    for candidate in "${CANDIDATES_TO_MERGE[@]}"; do
        if [[ "$candidate" == "$priority" ]]; then
            SORTED_CANDIDATES+=("$candidate")
            break
        fi
    done
done

# Add remaining branches sorted by ahead count (descending)
for candidate in "${CANDIDATES_TO_MERGE[@]}"; do
    if ! is_priority_branch "$candidate"; then
        SORTED_CANDIDATES+=("$candidate")
    fi
done

# Sort non-priority branches by ahead count
if [[ ${#SORTED_CANDIDATES[@]} -gt 0 ]]; then
    # Simple bubble sort for remaining branches (after priorities)
    priority_count=0
    for priority in "${PRIORITY_BASES[@]}"; do
        for candidate in "${CANDIDATES_TO_MERGE[@]}"; do
            if [[ "$candidate" == "$priority" ]]; then
                ((priority_count++))
                break
            fi
        done
    done
    
    # Sort remaining branches by ahead count (descending)
    for ((i = priority_count; i < ${#SORTED_CANDIDATES[@]}; i++)); do
        for ((j = i + 1; j < ${#SORTED_CANDIDATES[@]}; j++)); do
            branch_i="${SORTED_CANDIDATES[i]}"
            branch_j="${SORTED_CANDIDATES[j]}"
            if [[ ${BRANCH_AHEAD_COUNT["$branch_j"]} -gt ${BRANCH_AHEAD_COUNT["$branch_i"]} ]]; then
                # Swap
                temp="${SORTED_CANDIDATES[i]}"
                SORTED_CANDIDATES[i]="${SORTED_CANDIDATES[j]}"
                SORTED_CANDIDATES[j]="$temp"
            fi
        done
    done
fi

echo "Merge order (${#SORTED_CANDIDATES[@]} branches):"
for i in "${!SORTED_CANDIDATES[@]}"; do
    branch="${SORTED_CANDIDATES[i]}"
    ahead="${BRANCH_AHEAD_COUNT[$branch]}"
    priority_marker=""
    if is_priority_branch "$branch"; then
        priority_marker=" [PRIORITY]"
    fi
    echo "  $((i+1)). $branch ($ahead ahead)$priority_marker"
done

# Execute merges
if [[ ${#SORTED_CANDIDATES[@]} -eq 0 ]]; then
    log_info "No branches to merge"
else
    for branch in "${SORTED_CANDIDATES[@]}"; do
        log_header "Merging: $branch"
        
        # Perform dry-run merge test
        log_info "Testing merge compatibility..."
        if perform_dry_run_merge "$branch"; then
            log_success "No conflicts detected, proceeding with merge"
            
            # Perform actual merge
            merge_result=0
            execute_command "git merge --no-ff remotes/$REMOTE/$branch -m \"Merge $REMOTE/$branch into $TARGET_BRANCH\"" "Merge branch $branch" || merge_result=$?
            
            if [[ $merge_result -eq 0 ]]; then
                log_success "Successfully merged $branch"
                MERGED_BRANCHES+=("$branch (${BRANCH_AHEAD_COUNT[$branch]} commits)")
            else
                log_error "Merge failed for $branch"
                execute_command "git merge --abort" "Abort failed merge" || true
                CONFLICT_BRANCHES+=("$branch")
            fi
        else
            log_warning "Conflicts detected in dry-run, skipping automatic merge"
            
            # Get list of conflicting files
            temp_branch="conflict-test-$(date +%s)"
            git checkout -b "$temp_branch" >/dev/null 2>&1
            git merge --no-commit --no-ff "remotes/$REMOTE/$branch" >/dev/null 2>&1 || true
            conflicting_files=$(git diff --name-only --diff-filter=U | tr '\n' ' ')
            git merge --abort >/dev/null 2>&1 || true
            git checkout "$TARGET_BRANCH" >/dev/null 2>&1
            git branch -D "$temp_branch" >/dev/null 2>&1
            
            CONFLICT_BRANCHES+=("$branch (conflicts: $conflicting_files)")
        fi
    done
fi

# Final state
FINAL_SHA=$(git rev-parse HEAD)

log_header "4. Sync Report Summary"

echo -e "${BOLD}Target Branch:${NC} $TARGET_BRANCH"
echo -e "${BOLD}Initial SHA:${NC} $INITIAL_SHA"
echo -e "${BOLD}Final SHA:${NC} $FINAL_SHA"

if [[ "$INITIAL_SHA" != "$FINAL_SHA" ]]; then
    echo -e "${GREEN}✓ Branch updated with new commits${NC}"
    execute_command "git log --oneline $INITIAL_SHA..$FINAL_SHA" "Show new commits" || true
else
    echo -e "${YELLOW}• No changes made to branch${NC}"
fi

echo -e "\n${BOLD}Merged Cleanly (${#MERGED_BRANCHES[@]}):${NC}"
if [[ ${#MERGED_BRANCHES[@]} -eq 0 ]]; then
    echo "  None"
else
    for branch in "${MERGED_BRANCHES[@]}"; do
        echo -e "  ${GREEN}✓ $branch${NC}"
    done
fi

echo -e "\n${BOLD}Skipped (${#SKIPPED_BRANCHES[@]}):${NC}"
if [[ ${#SKIPPED_BRANCHES[@]} -eq 0 ]]; then
    echo "  None"
else
    for branch in "${SKIPPED_BRANCHES[@]}"; do
        echo -e "  ${YELLOW}• $branch${NC}"
    done
fi

echo -e "\n${BOLD}Needs Manual Resolution (${#CONFLICT_BRANCHES[@]}):${NC}"
if [[ ${#CONFLICT_BRANCHES[@]} -eq 0 ]]; then
    echo "  None"
else
    for branch in "${CONFLICT_BRANCHES[@]}"; do
        echo -e "  ${RED}✗ $branch${NC}"
    done
    
    echo -e "\n${BOLD}Manual Resolution Steps:${NC}"
    for branch in "${CONFLICT_BRANCHES[@]}"; do
        branch_name=$(echo "$branch" | cut -d' ' -f1)
        echo "  1. git merge remotes/$REMOTE/$branch_name"
        echo "  2. Resolve conflicts in listed files"
        echo "  3. git add <resolved-files>"
        echo "  4. git commit"
    done
fi

echo -e "\n${BOLD}Commands Executed:${NC}"
for cmd in "${COMMANDS_EXECUTED[@]}"; do
    echo "  $cmd"
done

echo -e "\n${BOLD}Next Steps:${NC}"
if [[ ${#CONFLICT_BRANCHES[@]} -gt 0 ]]; then
    echo "  1. Resolve conflicts manually (see above)"
    echo "  2. Re-run this script to continue with remaining branches"
    echo "  3. When all conflicts resolved:"
else
    echo "  1. Review the merged changes:"
    echo "     git log --oneline $INITIAL_SHA..HEAD"
    echo "  2. Test your changes"
    echo "  3. Push when ready:"
fi
echo "     # git push --set-upstream $REMOTE $TARGET_BRANCH"

log_header "Sync Complete"

if [[ ${#CONFLICT_BRANCHES[@]} -gt 0 ]]; then
    exit 1
else
    exit 0
fi
