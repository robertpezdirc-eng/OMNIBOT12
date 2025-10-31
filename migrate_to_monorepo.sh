#!/bin/bash
#
# Monorepo Migration Script
# Migrates multiple GitHub repositories into a single monorepo structure
# while preserving full git history using git-filter-repo
#
# Author: Robert Pezdirc
# Repository: robertpezdirc-eng/platforma
#

set -e  # Exit on error

# Configuration
GITHUB_USER="${GITHUB_USER:-robertpezdirc-eng}"
TARGET_REPO="${TARGET_REPO:-platforma}"
WORK_DIR="${WORK_DIR:-/tmp/monorepo-migration-$$}"
AUTO_FETCH_WITH_GH="${AUTO_FETCH_WITH_GH:-true}"
ARCHIVE_AFTER_IMPORT="${ARCHIVE_AFTER_IMPORT:-false}"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check dependencies
check_dependencies() {
    log_info "Checking dependencies..."
    
    local missing_deps=()
    
    if ! command -v git &> /dev/null; then
        missing_deps+=("git")
    fi
    
    if ! command -v git-filter-repo &> /dev/null; then
        log_warning "git-filter-repo not found. Installing..."
        if command -v pip3 &> /dev/null; then
            pip3 install git-filter-repo
        elif command -v pip &> /dev/null; then
            pip install git-filter-repo
        else
            missing_deps+=("git-filter-repo (install via: pip install git-filter-repo)")
        fi
    fi
    
    if [ "$AUTO_FETCH_WITH_GH" = "true" ] && ! command -v gh &> /dev/null; then
        log_warning "GitHub CLI (gh) not found. Will use manual repository list."
        AUTO_FETCH_WITH_GH="false"
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "Missing dependencies: ${missing_deps[*]}"
        exit 1
    fi
    
    log_success "All dependencies satisfied"
}

# Fetch repository list from GitHub
fetch_repositories() {
    log_info "Fetching repository list for user: $GITHUB_USER"
    
    if [ "$AUTO_FETCH_WITH_GH" = "true" ]; then
        log_info "Using GitHub CLI to fetch repositories..."
        gh repo list "$GITHUB_USER" --limit 1000 --json name,isPrivate,description,diskUsage --jq '.[] | "\(.name)|\(.isPrivate)|\(.description // "")|\(.diskUsage)"' > "$WORK_DIR/repos.txt"
        log_success "Fetched $(wc -l < "$WORK_DIR/repos.txt") repositories"
    else
        log_warning "AUTO_FETCH_WITH_GH disabled. Please provide repository list manually."
        log_info "Create file: $WORK_DIR/repos.txt with format: repo_name|is_private|description|size"
        exit 1
    fi
}

# Analyze if repository should be archived
should_archive_repo() {
    local repo_name="$1"
    local description="$2"
    local size="$3"
    
    # Archive criteria
    local archive_keywords=("test" "demo" "experiment" "scratch" "temp" "old" "deprecated" "archive" "backup")
    
    # Check description for archive keywords
    for keyword in "${archive_keywords[@]}"; do
        if echo "$description" | grep -qi "$keyword"; then
            echo "Contains keyword: $keyword"
            return 0
        fi
    done
    
    # Check if repo is very small (< 100 KB)
    if [ "$size" -lt 100 ]; then
        echo "Very small repository (< 100 KB)"
        return 0
    fi
    
    # Check repo name for archive patterns
    if echo "$repo_name" | grep -qiE "(test|demo|tmp|old|bak|backup|archive)"; then
        echo "Name suggests archive"
        return 0
    fi
    
    return 1
}

# Detect Git LFS usage and large files
detect_lfs_and_large_files() {
    local repo_path="$1"
    local repo_name="$2"
    
    log_info "Scanning $repo_name for LFS and large files..."
    
    cd "$repo_path"
    
    # Check for LFS
    if [ -f ".gitattributes" ] && grep -q "filter=lfs" .gitattributes; then
        log_warning "$repo_name uses Git LFS"
        echo "$repo_name|LFS" >> "$WORK_DIR/lfs_report.txt"
    fi
    
    # Find large files (> 10 MB)
    local large_files=$(git rev-list --objects --all | \
        git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | \
        sed -n 's/^blob //p' | \
        awk '$2 > 10485760 {print}' | \
        sort -k2 -n -r | \
        head -10)
    
    if [ -n "$large_files" ]; then
        log_warning "$repo_name contains large files (> 10 MB)"
        echo "=== $repo_name ===" >> "$WORK_DIR/large_files_report.txt"
        echo "$large_files" >> "$WORK_DIR/large_files_report.txt"
        echo "" >> "$WORK_DIR/large_files_report.txt"
    fi
}

# Scan for secrets and sensitive files
scan_for_secrets() {
    local repo_path="$1"
    local repo_name="$2"
    
    log_info "Scanning $repo_name for potential secrets..."
    
    cd "$repo_path"
    
    # List of patterns to check
    local sensitive_patterns=(
        "*.pem"
        "*.key"
        "*.p12"
        "*.pfx"
        "*id_rsa*"
        "*id_dsa*"
        "*.env"
        "*secret*"
        "*password*"
        "*credentials*"
        "*.crt"
        "*.cert"
    )
    
    local found_secrets=false
    for pattern in "${sensitive_patterns[@]}"; do
        local files=$(git ls-files | grep -iE "${pattern//\*/.*}" || true)
        if [ -n "$files" ]; then
            if [ "$found_secrets" = false ]; then
                echo "=== $repo_name ===" >> "$WORK_DIR/secrets_report.txt"
                found_secrets=true
            fi
            echo "$files" >> "$WORK_DIR/secrets_report.txt"
        fi
    done
    
    if [ "$found_secrets" = true ]; then
        log_warning "$repo_name may contain sensitive files"
        echo "" >> "$WORK_DIR/secrets_report.txt"
    fi
}

# Clone and prepare repository
clone_and_prepare_repo() {
    local repo_name="$1"
    local target_dir="$2"
    
    log_info "Cloning $repo_name..."
    
    local clone_url
    if [ -n "$GITHUB_TOKEN" ]; then
        clone_url="https://${GITHUB_TOKEN}@github.com/${GITHUB_USER}/${repo_name}.git"
    else
        clone_url="https://github.com/${GITHUB_USER}/${repo_name}.git"
    fi
    
    git clone --mirror "$clone_url" "$WORK_DIR/$repo_name.git"
    cd "$WORK_DIR/$repo_name.git"
    
    # Convert to regular repo for processing
    git config --bool core.bare false
    git config --unset core.bare
    
    # Checkout main branch (try different common names)
    git checkout main 2>/dev/null || \
        git checkout master 2>/dev/null || \
        git checkout "$(git branch -r | grep -v HEAD | head -1 | sed 's/.*\///')" 2>/dev/null || \
        log_warning "Could not checkout default branch"
}

# Apply git-filter-repo to move content to subdirectory
filter_repo_to_subdirectory() {
    local repo_path="$1"
    local target_subdir="$2"
    local repo_name="$3"
    
    log_info "Filtering $repo_name to subdirectory: $target_subdir"
    
    cd "$repo_path"
    
    # Use git-filter-repo to move everything to subdirectory
    # Note: git-filter-repo will handle tag renaming if needed
    git filter-repo --force --to-subdirectory-filter "$target_subdir/"
    
    # Prefix tags with repo name after filtering
    git tag | while read -r tag; do
        # Skip if already prefixed
        if [[ ! "$tag" =~ ^${repo_name}/ ]]; then
            git tag "${repo_name}/${tag}" "$tag" 2>/dev/null || true
            git tag -d "$tag" 2>/dev/null || true
        fi
    done
    
    log_success "Filtered $repo_name successfully"
}

# Merge repository into monorepo
merge_into_monorepo() {
    local repo_path="$1"
    local monorepo_path="$2"
    local repo_name="$3"
    
    log_info "Merging $repo_name into monorepo..."
    
    cd "$monorepo_path"
    
    # Add remote and fetch
    git remote add "$repo_name" "$repo_path" 2>/dev/null || true
    git fetch "$repo_name" --tags
    
    # Merge with allow unrelated histories
    git merge --allow-unrelated-histories -m "Merge $repo_name into monorepo" "$repo_name/$(git -C "$repo_path" branch --show-current)" || {
        log_error "Failed to merge $repo_name"
        git merge --abort 2>/dev/null || true
        return 1
    }
    
    # Remove remote
    git remote remove "$repo_name"
    
    log_success "Merged $repo_name into monorepo"
}

# Initialize monorepo structure
initialize_monorepo() {
    local monorepo_path="$1"
    
    log_info "Initializing monorepo structure..."
    
    mkdir -p "$monorepo_path"
    cd "$monorepo_path"
    
    if [ ! -d ".git" ]; then
        git init
        git config user.name "Monorepo Migration Script"
        git config user.email "migration@${GITHUB_USER}.local"
    fi
    
    # Create directory structure
    mkdir -p projects archive libs infra tools docs
    
    log_success "Monorepo initialized at $monorepo_path"
}

# Generate migration report
generate_report() {
    log_info "Generating migration report..."
    
    cat > "$WORK_DIR/MIGRATION_REPORT.md" << EOF
# Monorepo Migration Report

## Summary

Migration completed: $(date)
Target repository: ${GITHUB_USER}/${TARGET_REPO}

## Processed Repositories

| Repository | Destination | Tags Prefixed | LFS/Large Files | Archive Reason | Size (KB) |
|------------|-------------|---------------|-----------------|----------------|-----------|
EOF

    # Append repository details (populated during migration)
    cat "$WORK_DIR/processed_repos.txt" >> "$WORK_DIR/MIGRATION_REPORT.md" 2>/dev/null || true
    
    cat >> "$WORK_DIR/MIGRATION_REPORT.md" << 'EOF'

## Issues Requiring Attention

### License Conflicts
EOF
    cat "$WORK_DIR/license_conflicts.txt" >> "$WORK_DIR/MIGRATION_REPORT.md" 2>/dev/null || echo "No license conflicts detected." >> "$WORK_DIR/MIGRATION_REPORT.md"
    
    cat >> "$WORK_DIR/MIGRATION_REPORT.md" << 'EOF'

### Potential Secrets Found
EOF
    cat "$WORK_DIR/secrets_report.txt" >> "$WORK_DIR/MIGRATION_REPORT.md" 2>/dev/null || echo "No potential secrets found." >> "$WORK_DIR/MIGRATION_REPORT.md"
    
    cat >> "$WORK_DIR/MIGRATION_REPORT.md" << 'EOF'

### Large Files Detected
EOF
    cat "$WORK_DIR/large_files_report.txt" >> "$WORK_DIR/MIGRATION_REPORT.md" 2>/dev/null || echo "No large files detected." >> "$WORK_DIR/MIGRATION_REPORT.md"
    
    cat >> "$WORK_DIR/MIGRATION_REPORT.md" << 'EOF'

### LFS Repositories
EOF
    cat "$WORK_DIR/lfs_report.txt" >> "$WORK_DIR/MIGRATION_REPORT.md" 2>/dev/null || echo "No LFS usage detected." >> "$WORK_DIR/MIGRATION_REPORT.md"
    
    log_success "Report generated: $WORK_DIR/MIGRATION_REPORT.md"
}

# Main migration workflow
main() {
    log_info "Starting monorepo migration..."
    log_info "GitHub User: $GITHUB_USER"
    log_info "Target Repo: $TARGET_REPO"
    log_info "Work Directory: $WORK_DIR"
    
    # Create work directory
    mkdir -p "$WORK_DIR"
    
    # Initialize report files
    touch "$WORK_DIR/processed_repos.txt"
    touch "$WORK_DIR/lfs_report.txt"
    touch "$WORK_DIR/large_files_report.txt"
    touch "$WORK_DIR/secrets_report.txt"
    touch "$WORK_DIR/license_conflicts.txt"
    
    # Check dependencies
    check_dependencies
    
    # Fetch repositories
    fetch_repositories
    
    # Initialize monorepo
    local monorepo_path="$WORK_DIR/monorepo"
    initialize_monorepo "$monorepo_path"
    
    # Process each repository
    while IFS='|' read -r repo_name is_private description size; do
        log_info "Processing: $repo_name"
        
        # Skip target repo itself
        if [ "$repo_name" = "$TARGET_REPO" ]; then
            log_info "Skipping target repository: $repo_name"
            continue
        fi
        
        # Determine if should archive
        local archive_reason=""
        if archive_reason=$(should_archive_repo "$repo_name" "$description" "$size"); then
            local target_dir="archive/$repo_name"
            log_warning "Archiving $repo_name: $archive_reason"
        else
            local target_dir="projects/$repo_name"
        fi
        
        # Clone repository
        clone_and_prepare_repo "$repo_name" "$target_dir"
        
        # Scan for issues
        detect_lfs_and_large_files "$WORK_DIR/$repo_name.git" "$repo_name"
        scan_for_secrets "$WORK_DIR/$repo_name.git" "$repo_name"
        
        # Filter repository
        filter_repo_to_subdirectory "$WORK_DIR/$repo_name.git" "$target_dir" "$repo_name"
        
        # Merge into monorepo
        if merge_into_monorepo "$WORK_DIR/$repo_name.git" "$monorepo_path" "$repo_name"; then
            # Record in report
            local lfs_status="No"
            [ -f "$WORK_DIR/lfs_report.txt" ] && grep -q "$repo_name" "$WORK_DIR/lfs_report.txt" && lfs_status="Yes"
            
            echo "| $repo_name | $target_dir | Yes | $lfs_status | $archive_reason | $size |" >> "$WORK_DIR/processed_repos.txt"
        else
            log_error "Failed to process $repo_name"
        fi
        
    done < "$WORK_DIR/repos.txt"
    
    # Generate final report
    generate_report
    
    log_success "Migration completed!"
    log_info "Monorepo location: $monorepo_path"
    log_info "Migration report: $WORK_DIR/MIGRATION_REPORT.md"
    
    echo ""
    log_info "Next steps:"
    echo "1. Review the migration report: cat $WORK_DIR/MIGRATION_REPORT.md"
    echo "2. Inspect the monorepo: cd $monorepo_path"
    echo "3. Push to GitHub:"
    echo "   cd $monorepo_path"
    echo "   git remote add origin https://github.com/${GITHUB_USER}/${TARGET_REPO}.git"
    echo "   git push -u origin main"
}

# Run main function
main "$@"
