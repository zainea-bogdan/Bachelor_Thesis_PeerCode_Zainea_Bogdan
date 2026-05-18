# Git Analysis Module

This readme is the main documentation for the standalone **Git Analysis Module**. It covers the full API structure, endpoint roles, parameters, and how to run the service via Docker.

---

# Overview

The main role of this service is to wrap the official GitHub REST API and return clean, structured data about a given user and their public repository activity. On top of raw data endpoints, the module exposes a dedicated metrics layer that computes behavioral analysis of a student's commit history and validates repo structure against a project blueprint.

## Technical Limitations

This module uses a **PAT (Personal Access Token)** to authenticate GitHub API calls, which raises the rate limit from 60 to 5000 requests/day. Without a PAT configured in `.env`, the service will fail to start correctly. See `.env.example` for the required variable.

---

# Running with Docker

```bash
# Build the image
docker build -t git-analysis .

# Run — token is passed at runtime, never baked into the image
docker run -p 8000:8000 --env-file .env --name git-analysis git-analysis
```

Base URL: `http://localhost:8000/api`

---

# API Endpoints

> All endpoints are prefixed with `/api`

---

## User Data

### `GET /user/{username}`
Returns public profile info for a GitHub user.
- **Role:** Student profile feature — display username, bio, follower count, public repos.

---

## Repository Data

### `GET /user/{username}/repos`
Returns all public repositories for a given user.
- **Role:** Let teachers and students browse available repos.

### `GET /user/{username}/repos/{repo_name}`
Returns metadata for a single repository.
- **Role:** Validate that a submitted repo link exists before linking it to a project blueprint.

### `GET /user/{username}/repos/{repo_name}/contributors`
Returns the list of contributors and their total commit count for the repo.
- **Role:** Raw contributor data — used to support the contributors percentage metrics endpoint.

### `GET /user/{username}/repos/{repo_name}/tree`
Returns the full recursive file/folder tree of the repo at the last commit on the main branch.
- **Role:** Raw structure data — used to support the structure validation metrics endpoint.

---

## Commits Data

### `GET /user/{username}/repos/{repo_name}/commits`
Returns all commits within a given date window.
- **Role:** Raw commit data feed — used by the metrics layer and for individual commit drill-down.
- **Query params:**
  - `start_date` — `YYYY-MM-DD` (project start)
  - `deadline` — `YYYY-MM-DD` (project deadline)

### `GET /user/{username}/repos/{repo_name}/commits/{commit_sha}`
Returns detailed data for a single commit including stats and files changed.
- **Role:** Individual commit inspection — additions, deletions, files touched.

---

## Metrics

### `GET /user/{username}/repos/{repo_name}/metrics/commits_timeline_analysis`
Analyses the student's commit behaviour over the project window and returns a set of behavioral metrics plus flags.
- **Role:** Core evaluation endpoint — tells the teacher how the student worked across the project timeline.
- **Query params:**
  - `project_start_date` — `YYYY-MM-DD`
  - `deadline` — `YYYY-MM-DD`

#### Metrics returned and their definitions:

| Metric | Definition |
|---|---|
| `total_commits` | Total number of commits in the project window, including merge commits |
| `total_merge_commits` | Commits with more than one parent — produced by branch merges |
| `total_non_merge_commits` | Regular work commits, excluding merge commits |
| `total_student_authored_commits` | Commits where the author login matches the student's GitHub username |
| `total_external_author_commits` | Commits where the author is not the student — bots, collaborators, or external pushes |
| `ratio_external_author_commits` | `external_author_commits / total_commits` — share of commits not from the student |
| `ratio_author_based_commits` | `student_authored_commits / total_commits` — share of commits from the student |
| `project_window_days` | Total days between `project_start_date` and `deadline` |
| `activity_span_days` | Days between the student's first and last commit |
| `active_days` | Number of unique calendar days where the student made at least one commit |
| `window_utilization_ratio` | `active_days / project_window_days` — how much of the available time the student was active |
| `days_before_start_to_first_commit` | How many days into the project window the student made their first commit — high value means late start |
| `days_before_deadline_last_commit` | How many days before the deadline the student made their last commit |
| `gini_coefficient` | Measures inequality of commit distribution across the project window — 0 = perfectly even, closer to 1 = all commits concentrated on few days |
| `largest_inactivity_gap_days` | The longest consecutive streak of days without a single commit |
| `avg_inactivity_gap_days` | Average number of days between active days |
| `std_dev_intercommit_interval` | Standard deviation of time (hours) between consecutive commits — high value indicates erratic burst-style work sessions |
| `avg_commits_per_active_day` | `student_commits / active_days` — average workload on days the student was active |
| `avg_commits_per_calendar_day` | `student_commits / project_window_days` — average workload spread over the full project window |
| `ratio_last_3days_commits` | Percentage of commits made in the 3 days immediately before the deadline |
| `max_day_commits_ratio` | Percentage of total commits made on the single most active day |
| `q1_commits_ratio` | Percentage of commits made in the first quarter of the project window |
| `q2_commits_ratio` | Percentage of commits made in the second quarter of the project window |
| `q3_commits_ratio` | Percentage of commits made in the third quarter of the project window |
| `q4_commits_ratio` | Percentage of commits made in the final quarter of the project window |
| `weekday_commit_ratio` | Percentage of commits made on weekdays (Mon–Fri) |
| `weekend_commit_ratio` | Percentage of commits made on weekends (Sat–Sun) |

#### Flags generated:

| Flag | Type | Condition |
|---|---|---|
| `LOW_COMMIT_ACTIVITY` | warning | Fewer than 4 student-authored commits over the project window |
| `LATE_START_PATTERN` | warning | First commit made after 60% of the project window had already elapsed |
| `LAST_MINUTE_ACTIVITY` | warning | More than 50% of commits made in the last 3 days before deadline |
| `HIGH_SAME_DAY_CONCENTRATION` | warning | More than 60% of commits made on a single day |
| `LONG_INACTIVITY_GAP` | warning | A gap of 4 or more consecutive days without any commit |
| `HIGH_EXTERNAL_AUTHOR_RATIO` | warning | More than 30% of commits authored by an identity other than the student |
| `LOW_WINDOW_UTILIZATION` | warning | Student committed on fewer than 20% of available project days |
| `UNEVEN_DISTRIBUTION` | warning | Gini coefficient above 0.7 — highly concentrated commit activity |
| `ERRATIC_COMMIT_RHYTHM` | warning | Std dev of inter-commit interval above 72h |
| `MOST_ACTIVE_QUARTER_Q1/Q2/Q3/Q4` | informational | Marks which quarter of the project window had the highest commit concentration |
| `DOMINANT_WORK_PATTERN_WEEKDAY/WEEKEND` | informational | Marks whether the student predominantly commits on weekdays or weekends |

---

### `GET /user/{username}/repos/{repo_name}/metrics/contributors_percentage`
Returns the breakdown of commit authorship across all contributors in the project window.
- **Role:** For solo repos — shows what percentage of commits were actually authored by the student vs bots or external actors.
- **Query params:**
  - `project_start_date` — `YYYY-MM-DD`
  - `deadline` — `YYYY-MM-DD`
- **Returns:** Per-contributor commit count and percentage, with `is_student` flag marking the expected student account.
- **Flags generated:**
  - `LOW_STUDENT_AUTHORSHIP` — student authored less than 70% of commits

---

### `POST /user/{username}/repos/{repo_name}/metrics/structure_validation`
Validates the actual repo structure against an expected folder/file layout from a project blueprint.
- **Role:** Check whether the student implemented the required project structure and that files/folders are not empty placeholders.
- **Request body:**
```json
{
    "expected_structure": {
        "src/": "application source code",
        ".gitignore": "must exclude node_modules, .env",
        "README.md": "project readme",
        "ETL_pipeline/src/extract/": "extract pipeline components",
        "ETL_pipeline/src/transform/": "transform pipeline components",
        "ETL_pipeline/src/load/": "load pipeline components"
    }
}
```
- **Key:** paths ending with `/` are treated as directories, others as files.
- **Status per path:** `present` / `missing` / `placeholder` (file exists but has 0 bytes, or directory exists but contains no files)
- **Returns:** Per-path status, compliance ratio (present / total required), and flags.
- **Flags generated:**
  - `MISSING_REQUIRED_PATHS` — one or more required paths are absent from the repo
  - `PLACEHOLDER_PATHS_DETECTED` — one or more paths exist but contain no content
