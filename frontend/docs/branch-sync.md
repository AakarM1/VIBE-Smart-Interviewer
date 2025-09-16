# Branch Sync Documentation

## Overview

The `tools/sync_branch.sh` script automates the process of safely merging commits from important upstream branches into your target branch. This helps minimize future conflicts and keeps your branch up-to-date with the latest changes from trunk branches.

## When to Run

Run this script in the following scenarios:

1. **Before starting new work** - Ensure your branch has the latest changes from important upstream branches
2. **Before opening a Pull Request** - Reduce the likelihood of conflicts during PR review
3. **After major releases** - Sync with release branches or updated trunk branches
4. **Periodically during long-running feature development** - Stay current with evolving codebase

## Usage

```bash
# Basic usage (syncs current branch with origin)
bash tools/sync_branch.sh origin $(git branch --show-current)

# Explicit target branch
bash tools/sync_branch.sh origin my-feature-branch

# Include branches with fewer than 5 ahead commits
bash tools/sync_branch.sh origin my-branch --include-low-ahead
```

### Parameters

- `REMOTE`: Git remote name (typically `origin`)
- `TARGET_BRANCH`: Your local branch to sync
- `--include-low-ahead`: Include branches with < 5 commits ahead (optional)

## How It Works

### Merge Ordering Strategy

The script prioritizes merges in this specific order to minimize conflicts:

1. **Priority trunk branches** (in order): `main`, `master`, `dev`
   - These are considered "shared bases" that most feature branches should include
   - Merged first regardless of commit count

2. **High-impact branches**: Other remote branches with ≥5 commits ahead
   - Sorted by commit count (most commits first)
   - Likely to be important shared branches or recent releases

3. **Low-impact branches**: Branches with <5 commits ahead (only if `--include-low-ahead` specified)
   - Usually feature branches that may not be relevant

### Exclusions

The script automatically excludes:
- Branches prefixed with `dependabot/`
- Branches prefixed with `renovate/`
- The target branch itself

## Conflict Resolution

When conflicts are detected:

1. **Dry-run first**: Script tests each merge without committing
2. **Safe abort**: Conflicting merges are safely aborted
3. **Continue processing**: Script continues with remaining branches
4. **Detailed reporting**: Lists conflicting files for manual resolution

### Manual Resolution Process

When conflicts occur, follow these steps:

```bash
# 1. Start the manual merge
git merge remotes/origin/conflicting-branch

# 2. Resolve conflicts in your editor
# Edit the files listed in the conflict report

# 3. Stage resolved files
git add path/to/resolved/file.js

# 4. Complete the merge
git commit

# 5. Re-run sync script to continue with remaining branches
bash tools/sync_branch.sh origin your-branch
```

## Safety Features

- **No automatic pushes**: Script never pushes changes automatically
- **Preserved history**: Uses merge commits instead of rebasing
- **Idempotent**: Safe to run multiple times - skips already-merged branches
- **Conflict memory**: Enables `git rerere` to remember conflict resolutions
- **Detailed logging**: Records all executed commands for transparency

## Example Workflow

```bash
# 1. Start with clean working directory
git status

# 2. Run sync script
bash tools/sync_branch.sh origin my-feature

# 3. Review changes
git log --oneline $(git merge-base origin/main HEAD)..HEAD

# 4. Test your code
npm test  # or your test command

# 5. Push when ready
git push --set-upstream origin my-feature
```

## Output

The script provides a comprehensive sync report including:

- **Before/after SHA**: Track what changed
- **Merged cleanly**: Branches successfully integrated
- **Skipped**: Up-to-date or low-impact branches
- **Conflicts**: Branches requiring manual resolution
- **Commands executed**: Full transparency of operations
- **Next steps**: Clear guidance for follow-up actions

## Requirements

- **Git ≥ 2.30**: Modern Git with improved merge conflict handling
- **Bash shell**: Works on macOS, Linux, and Windows (via Git Bash/WSL)
- **Clean working directory**: Commit or stash changes before running

## Troubleshooting

### Common Issues

1. **"not a git repository"**
   - Ensure you're in the root of a Git repository

2. **"Local branch does not exist"**
   - Create the target branch: `git checkout -b branch-name`

3. **"Could not fast-forward"**
   - Your branch has local commits ahead of remote - this is normal

4. **Persistent conflicts**
   - Consider interactive rebase: `git rebase -i origin/main`
   - Or create a fresh branch from main and cherry-pick commits

### Reset if Needed

If something goes wrong, you can reset to the initial state:

```bash
# Find the initial SHA from script output
git reset --hard <initial-sha>
```

The script always shows the initial HEAD SHA at the beginning of execution for easy recovery.
