from datetime import datetime, timedelta
import statistics


DEFAULT_THRESHOLDS = {
    "low_commit_activity": 4,
    "late_start_pattern": 0.6,
    "last_minute_activity": 0.5,
    "high_same_day_concentration": 0.6,
    "long_inactivity_gap_days": 4,
    "high_external_author_ratio": 0.3,
    "low_window_utilization": 0.2,
    "uneven_distribution_gini": 0.7,
    "erratic_commit_rhythm_hours": 72,
}


class CommitsMetricsService:

    def _gini_coefficient(self, values: list) -> float: # lorrenz curve method
        n = len(values) # the number of days between 
        if n == 0 or sum(values) == 0: # here i check if the windows has at least 1 day and at least 1 commit done in it
            return 0.0
        sorted_vals = sorted(values) # sorting the values ascending
        cumsum = sum((2 * (i + 1) - n - 1) * v for i, v in enumerate(sorted_vals))
        return cumsum / (n * sum(sorted_vals))

    def _parse_commit_datetime(self,commit):
        return datetime.strptime(commit.get("commit_committer_date"), "%Y-%m-%dT%H:%M:%SZ")

    def analyse_commits_timeline(
        self,
        commits: list,
        github_username: str,
        repo_name: str,
        project_start_date: str,
        deadline: str,
        thresholds_override: dict = None
    ) -> dict:

        thresholds = {**DEFAULT_THRESHOLDS}
        if thresholds_override:
            thresholds.update({k: v for k, v in thresholds_override.items() if v is not None})

            #am scos datele de inceput si final ale proeictului
            project_start = datetime.strptime(project_start_date, "%Y-%m-%d").date()
            deadline_date = datetime.strptime(deadline, "%Y-%m-%d").date()


            #numar cate commituri am merge si nonmerge
            merge_commits = []
            non_merge_commits = []
            for commit in commits:
                if commit.get("is_merge_commit"):
                    merge_commits.append(commit)
                else:
                    non_merge_commits.append(commit)

            #numar cate commituri sunt ale studentului sau nu
            student_authored_commits = []
            external_author_commits = []
            for commit in commits:
                if commit.get("commit_author_login") == github_username:
                    student_authored_commits.append(commit)
                else:
                    external_author_commits.append(commit)

            #totaluri de commits
            total_commits = len(commits)
            total_merge_commits = len(merge_commits)
            total_non_merge_commits = len(non_merge_commits)
            total_student_authored_commits = len(student_authored_commits)
            total_external_author_commits = len(external_author_commits)

            if total_student_authored_commits == 0:
                return {
                    "status": "no_student_commits",
                    "error": "No commits authored by the student were found in the project window."
                }

            #scot lista cu datele commiturilor
            student_commit_datetimes_unsorted = []
            for c in student_authored_commits:
                student_commit_datetimes_unsorted.append(self._parse_commit_datetime(c))
            student_commit_datetimes = sorted(student_commit_datetimes_unsorted)

            student_commit_dates = []
            for dt in student_commit_datetimes:
                student_commit_dates.append(dt.date())

            #scot data primului si ultimului commit.
            first_commit_date = student_commit_dates[0]
            last_commit_date = student_commit_dates[-1]

            #calculez cat % valoareaza total de commits author-nonauthor 
            if total_commits > 0:
                ratio_external_author_commits = total_external_author_commits / total_commits
                ratio_author_based_commits = total_student_authored_commits/total_commits
            else:
                ratio_external_author_commits=0
                ratio_author_based_commits=0

            
            project_window_days = (deadline_date - project_start).days
            activity_span_days = (last_commit_date - first_commit_date).days
            active_days_set = set(student_commit_dates) #zilele in care a lucrat unice
            active_days = len(active_days_set)
            window_utilization_ratio = active_days / project_window_days if project_window_days > 0 else 0
            days_before_start_to_first_commit = (first_commit_date - project_start).days
            days_before_deadline_last_commit = (deadline_date - last_commit_date).days


            all_window_days = []
            for i in range(project_window_days + 1):
                all_window_days.append(project_start + timedelta(days=i))

            commits_per_day_map = {}
            for d in student_commit_dates:
                commits_per_day_map[d] = commits_per_day_map.get(d, 0) + 1

            commits_per_day_array = []
            for d in all_window_days:
                commits_per_day_array.append(commits_per_day_map.get(d, 0))

            gini_coefficient = round(self._gini_coefficient(commits_per_day_array), 4)

            sorted_active_days = sorted(active_days_set)
            gaps = []
            for i in range(1, len(sorted_active_days)):
                gap_in_days = (sorted_active_days[i] - sorted_active_days[i - 1]).days
                gaps.append(gap_in_days)
            largest_inactivity_gap_days = max(gaps) if gaps else 0
            avg_inactivity_gap_days = round(sum(gaps) / len(gaps), 2) if gaps else 0

            intervals_hours = []
            for i in range(1, len(student_commit_datetimes)):
                gap_in_seconds = (student_commit_datetimes[i] - student_commit_datetimes[i - 1]).total_seconds()
                gap_in_hours = gap_in_seconds / 3600
                intervals_hours.append(gap_in_hours)

            if len(intervals_hours) >= 2:
                std_dev_intercommit_interval = round(statistics.stdev(intervals_hours), 2)
            else:
                std_dev_intercommit_interval = 0

            avg_commits_per_active_day = round(total_student_authored_commits / active_days, 2)
            avg_commits_per_calendar_day = round(total_student_authored_commits / project_window_days, 2) if project_window_days > 0 else 0

            #last days works metrics
            last_3_days = set()
            for i in range(3):
                last_3_days.add(deadline_date - timedelta(days=i))

            last_3_days_count = 0
            for d in student_commit_dates:
                if d in last_3_days:
                    last_3_days_count += 1
            ratio_last_3days_commits = round(last_3_days_count / total_student_authored_commits, 4)

            max_commits_one_day = max(commits_per_day_map.values())
            max_day_commits_ratio = round(max_commits_one_day / total_student_authored_commits, 4)

            quarter_length = project_window_days / 4
            quarter_counts = {1: 0, 2: 0, 3: 0, 4: 0}
            for d in student_commit_dates:
                days_in = (d - project_start).days
                if days_in < quarter_length:
                    quarter_counts[1] += 1
                elif days_in < 2 * quarter_length:
                    quarter_counts[2] += 1
                elif days_in < 3 * quarter_length:
                    quarter_counts[3] += 1
                else:
                    quarter_counts[4] += 1

            q1_commits_ratio = round(quarter_counts[1] / total_student_authored_commits, 4)
            q2_commits_ratio = round(quarter_counts[2] / total_student_authored_commits, 4)
            q3_commits_ratio = round(quarter_counts[3] / total_student_authored_commits, 4)
            q4_commits_ratio = round(quarter_counts[4] / total_student_authored_commits, 4)

            weekday_count = sum(1 for d in student_commit_dates if d.weekday() < 5)
            weekend_count = total_student_authored_commits - weekday_count
            weekday_commit_ratio = round(weekday_count / total_student_authored_commits, 4)
            weekend_commit_ratio = round(weekend_count / total_student_authored_commits, 4)


            metrics = {
                "total_commits": total_commits,
                "total_merge_commits": total_merge_commits,
                "total_non_merge_commits": total_non_merge_commits,
                "total_student_authored_commits": total_student_authored_commits,
                "total_external_author_commits": total_external_author_commits,
                "ratio_external_author_commits": round(ratio_external_author_commits, 4),
                "ratio_author_based_commits":round(ratio_author_based_commits, 4),

                "project_window_days": project_window_days,
                "activity_span_days": activity_span_days,
                "active_days": active_days,
                "window_utilization_ratio": round(window_utilization_ratio, 4),
                "days_before_start_to_first_commit": days_before_start_to_first_commit,
                "days_before_deadline_last_commit": days_before_deadline_last_commit,

                "gini_coefficient": gini_coefficient,
                "largest_inactivity_gap_days": largest_inactivity_gap_days,
                "avg_inactivity_gap_days": avg_inactivity_gap_days,
                "std_dev_intercommit_interval": std_dev_intercommit_interval,
                "avg_commits_per_active_day": avg_commits_per_active_day,
                "avg_commits_per_calendar_day": avg_commits_per_calendar_day,

                "ratio_last_3days_commits": ratio_last_3days_commits,
                "max_day_commits_ratio": max_day_commits_ratio,
                "q1_commits_ratio": q1_commits_ratio,
                "q2_commits_ratio": q2_commits_ratio,
                "q3_commits_ratio": q3_commits_ratio,
                "q4_commits_ratio": q4_commits_ratio,
                "weekday_commit_ratio": weekday_commit_ratio,
                "weekend_commit_ratio": weekend_commit_ratio,
            }

            # --- FLAGS ---
            flags = []

            if total_student_authored_commits < thresholds["low_commit_activity"]:
                flags.append({
                    "name": "LOW_COMMIT_ACTIVITY",
                    "type": "warning",
                    "description": f"Student made only {total_student_authored_commits} real commits over a {project_window_days}-day project window."
                })

            late_start_ratio = days_before_start_to_first_commit / project_window_days if project_window_days > 0 else 0
            if late_start_ratio > thresholds["late_start_pattern"]:
                flags.append({
                    "name": "LATE_START_PATTERN",
                    "type": "warning",
                    "description": f"Student made their first commit {days_before_start_to_first_commit} days into the project window — {round(late_start_ratio * 100)}% of the available time had elapsed before any work began."
                })

            if ratio_last_3days_commits > thresholds["last_minute_activity"]:
                flags.append({
                    "name": "LAST_MINUTE_ACTIVITY",
                    "type": "warning",
                    "description": f"{round(ratio_last_3days_commits * 100)}% of all commits were made in the 3 days leading up to the deadline, suggesting late-stage cramming rather than progressive work."
                })

            if max_day_commits_ratio > thresholds["high_same_day_concentration"]:
                flags.append({
                    "name": "HIGH_SAME_DAY_CONCENTRATION",
                    "type": "warning",
                    "description": f"{round(max_day_commits_ratio * 100)}% of all commits were made in a single day, indicating a work burst rather than gradual progress."
                })

            if largest_inactivity_gap_days >= thresholds["long_inactivity_gap_days"]:
                flags.append({
                    "name": "LONG_INACTIVITY_GAP",
                    "type": "warning",
                    "description": f"Longest period without a commit was {largest_inactivity_gap_days} consecutive days."
                })

            if ratio_external_author_commits > thresholds["high_external_author_ratio"]:
                flags.append({
                    "name": "HIGH_EXTERNAL_AUTHOR_RATIO",
                    "type": "warning",
                    "description": f"{round(ratio_external_author_commits * 100)}% of commits were authored by an identity other than the student. This may indicate external contributions or AI-generated code pushed by the student."
                })

            if window_utilization_ratio < thresholds["low_window_utilization"]:
                flags.append({
                    "name": "LOW_WINDOW_UTILIZATION",
                    "type": "warning",
                    "description": f"Student committed on only {active_days} out of {project_window_days} available days ({round(window_utilization_ratio * 100)}% of the project window)."
                })

            if gini_coefficient > thresholds["uneven_distribution_gini"]:
                flags.append({
                    "name": "UNEVEN_DISTRIBUTION",
                    "type": "warning",
                    "description": f"Commit distribution is highly uneven (Gini: {gini_coefficient:.2f}), indicating burst-style work rather than consistent progress across the project window."
                })

            if std_dev_intercommit_interval > thresholds["erratic_commit_rhythm_hours"]:
                flags.append({
                    "name": "ERRATIC_COMMIT_RHYTHM",
                    "type": "warning",
                    "description": f"High variance in time between commits (std dev: {std_dev_intercommit_interval}h), indicating irregular burst-style work sessions rather than a consistent commit rhythm."
                })

            max_quarter_ratio = max(q1_commits_ratio, q2_commits_ratio, q3_commits_ratio, q4_commits_ratio)
            quarter_flag_map = {
                1: ("MOST_ACTIVE_QUARTER_Q1", q1_commits_ratio, "first"),
                2: ("MOST_ACTIVE_QUARTER_Q2", q2_commits_ratio, "second"),
                3: ("MOST_ACTIVE_QUARTER_Q3", q3_commits_ratio, "third"),
                4: ("MOST_ACTIVE_QUARTER_Q4", q4_commits_ratio, "final"),
            }
            for flag_name, ratio, label in quarter_flag_map.values():
                if ratio == max_quarter_ratio:
                    flags.append({
                        "name": flag_name,
                        "type": "informational",
                        "description": f"Most activity was concentrated in the {label} quarter of the project window ({round(ratio * 100)}% of commits)."
                    })

            if weekday_commit_ratio >= weekend_commit_ratio:
                flags.append({
                    "name": "DOMINANT_WORK_PATTERN_WEEKDAY",
                    "type": "informational",
                    "description": f"Student predominantly commits on weekdays ({round(weekday_commit_ratio * 100)}% of commits Mon–Fri)."
                })
            else:
                flags.append({
                    "name": "DOMINANT_WORK_PATTERN_WEEKEND",
                    "type": "informational",
                    "description": f"Student predominantly commits on weekends ({round(weekend_commit_ratio * 100)}% of commits Sat–Sun)."
                })

            # --- METADATA DATES ---
            metadata_dates = {
                "project_start_date": str(project_start),
                "deadline": str(deadline_date),
                "first_commit_date": str(first_commit_date),
                "last_commit_date": str(last_commit_date),
            }

            return {
                "status": "success",
                "commits_timeline_analysis_metrics": {
                    "repo": repo_name,
                    "category": "commits_timeline_analysis",
                    "project_start": project_start_date,
                    "deadline": deadline,
                    "metrics": metrics,
                    "flags": flags,
                    "metadata_dates": metadata_dates,
                }
        }

    def analyse_contributors_percentage(
        self,
        commits: list,
        github_username: str,
        repo_name: str,
        project_start_date: str,
        deadline: str,
    ) -> dict:

        thresholds = DEFAULT_THRESHOLDS
        total = len(commits)

        if total == 0:
            return {
                "status": "no_commits",
                "error": "No commits found in the project window."
            }

        contributor_counts = {}
        for commit in commits:
            login = commit.get("commit_author_login") or "unknown"
            contributor_counts[login] = contributor_counts.get(login, 0) + 1

        contributors = []
        for login, count in sorted(contributor_counts.items(), key=lambda x: x[1], reverse=True):
            contributor = {
                "login": login,
                "commit_count": count,
                "percentage": round(count / total, 4),
                "is_student": login == github_username,
            }
            contributors.append(contributor)

        student_share = 0
        for contributor in contributors:
            if contributor["is_student"]:
                student_share = contributor["percentage"]
                break

        flags = []
        if student_share < thresholds["high_external_author_ratio"]:
            flags.append({
                "name": "LOW_STUDENT_AUTHORSHIP",
                "type": "warning",
                "description": f"{github_username} authored only {round(student_share * 100)}% of commits — a significant portion was pushed by other identities (bots, external contributors)."
            })

        return {
            "status": "success",
            "contributors_percentage_analysis": {
                "repo": repo_name,
                "category": "contributors_percentage_analysis",
                "project_start": project_start_date,
                "deadline": deadline,
                "total_commits": total,
                "contributors": contributors,
                "flags": flags,
            }
        }


