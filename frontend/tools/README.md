# Development Tools

This directory contains automation scripts and tools for the VIBE project development workflow.

## Branch Sync Tool

**Purpose**: Automatically merge commits from important upstream branches into your target branch to minimize conflicts and stay current with the codebase.

### Quick Start

**Linux/macOS/Git Bash:**
```bash
bash tools/sync_branch.sh origin your-branch-name
```

**Windows PowerShell:**
```powershell
.\tools\sync_branch.ps1 origin your-branch-name
```

### Files

- **`sync_branch.sh`** - Main sync automation script (Bash)
- **`sync_branch.ps1`** - PowerShell wrapper for Windows users
- **`../docs/branch-sync.md`** - Comprehensive documentation
- **`../docs/example-sync-run.md`** - Example output and usage scenarios

### Key Features

- ✅ **Safe**: Dry-run testing prevents destructive merges
- ✅ **Smart ordering**: Prioritizes trunk branches (`main`, `master`, `dev`)
- ✅ **Conflict handling**: Graceful failure with detailed conflict reporting
- ✅ **Idempotent**: Safe to run multiple times
- ✅ **Transparent**: Logs all executed commands
- ✅ **No auto-push**: You control when changes are pushed

### Usage Examples

```bash
# Basic sync with current branch
bash tools/sync_branch.sh origin $(git branch --show-current)

# Include branches with few commits
bash tools/sync_branch.sh origin my-feature --include-low-ahead

# Windows PowerShell
.\tools\sync_branch.ps1 origin my-feature -IncludeLowAhead
```

### When to Use

- 📅 **Before starting new work** - Get latest changes
- 🔀 **Before opening PRs** - Reduce merge conflicts  
- 🚀 **After releases** - Sync with updated trunk branches
- ⏰ **Periodically** - Stay current during long-running development

### Integration with Git Workflow

1. **Fetch latest**: Script automatically fetches all remote refs
2. **Analyze divergence**: Identifies which branches have new commits
3. **Smart merging**: Merges in optimal order to minimize conflicts
4. **Conflict detection**: Safely handles merge conflicts
5. **Clear reporting**: Shows exactly what was merged and what needs attention

For detailed documentation, see [`docs/branch-sync.md`](../docs/branch-sync.md).
