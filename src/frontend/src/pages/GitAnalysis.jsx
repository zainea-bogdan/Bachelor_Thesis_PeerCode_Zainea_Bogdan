import { useState, useEffect } from "react";
import api from "../services/api";
import Navbar from "../components/Navbar";
import "./GitAnalysis.css";

const GitAnalysis = () => {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [analytics, setAnalytics] = useState([]);
  const [noAssignment, setNoAssignment] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const [commits, setCommits] = useState({});
  const [loadingCommits, setLoadingCommits] = useState(false);
  const [expandedCommit, setExpandedCommit] = useState(null);
  const [commitDetail, setCommitDetail] = useState({});
  const [loadingCommit, setLoadingCommit] = useState(null);

  useEffect(() => {
    api.get("/courses").then((res) => setCourses(res.data));
  }, []);

  useEffect(() => {
    if (!selectedCourse) return;
    fetchAnalytics();
    fetchNoAssignment();
  }, [selectedCourse]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/analytics/courses/${selectedCourse}/analytics`);
      setAnalytics(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNoAssignment = async () => {
    try {
      const res = await api.get(`/analytics/courses/${selectedCourse}/students/no-assignment`);
      setNoAssignment(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshResult(null);
    try {
      const res = await api.post("/analytics/refresh", { course_id: selectedCourse });
      setRefreshResult(res.data);
      fetchAnalytics();
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleExpandRow = async (assignment) => {
    const key = assignment.id;
    if (expandedRow === key) {
      setExpandedRow(null);
      return;
    }
    setExpandedRow(key);
    if (commits[key]) return;

    const stat = assignment.git_analysis_statistics?.[0];
    if (!stat) return;

    const username = assignment.student?.github_username;
    const repoUrl = assignment.repo_url;
    if (!username || !repoUrl) return;

    const repoName = repoUrl.split("/").pop();
    const startDate = stat.summary?.metadata_dates?.project_start_date;
    const deadline = stat.summary?.metadata_dates?.deadline;

    setLoadingCommits(true);
    try {
      const res = await api.get(`/analytics/commits/${username}/${repoName}`, {
        params: { start_date: startDate, deadline },
      });
      setCommits((prev) => ({ ...prev, [key]: res.data }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCommits(false);
    }
  };

  const handleExpandCommit = async (assignmentId, commit) => {
    const key = commit.commit_sha;
    if (expandedCommit === key) {
      setExpandedCommit(null);
      return;
    }
    setExpandedCommit(key);
    if (commitDetail[key]) return;

    const assignment = analytics.find((a) => a.id === assignmentId);
    const username = assignment?.student?.github_username;
    const repoName = assignment?.repo_url?.split("/").pop();

    setLoadingCommit(key);
    try {
      const res = await api.get(`/analytics/commits/${username}/${repoName}/${commit.commit_sha}`);
      setCommitDetail((prev) => ({ ...prev, [key]: res.data }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCommit(null);
    }
  };

  return (
    <div className="page">
      <Navbar />
      <div className="page-content">
        <div className="page-header">
          <div>
            <h1>Git Analysis</h1>
            <p>Analyze student GitHub activity per course</p>
          </div>
        </div>

        <div className="ga-controls">
          <select className="ga-select" value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)}>
            <option value="">Select a course</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.subject?.name} — {c.series} {c.university_year}
              </option>
            ))}
          </select>
          {selectedCourse && (
            <button className="btn-primary" onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? "Analyzing..." : "Refresh analysis"}
            </button>
          )}
        </div>

        {refreshResult && (
          <div className="ga-refresh-result">
            Analysis complete — {refreshResult.analyzed} analyzed, {refreshResult.failed} failed, {refreshResult.skipped} skipped.
          </div>
        )}

        {selectedCourse && !loading && (
          <>
            <div className="ga-section">
              <h2>Student activity</h2>
              {analytics.length === 0 ? (
                <p className="ga-empty">No analysis data yet. Click Refresh analysis to run.</p>
              ) : (
                <div className="ga-table-wrap">
                  <table className="ga-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Blueprint</th>
                        <th>Status</th>
                        <th>Commits</th>
                        <th>Active days</th>
                        <th>Late start</th>
                        <th>One day spike</th>
                        <th>Flags</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.map((a) => {
                        const stat = a.git_analysis_statistics?.[0];
                        const isExpanded = expandedRow === a.id;
                        const rowCommits = commits[a.id] || [];
                        const flags = stat?.summary?.flags || [];

                        return (
                          <>
                            <tr key={a.id} className="ga-row" onClick={() => handleExpandRow(a)} style={{ cursor: "pointer" }}>
                              <td>
                                <div className="ga-student-name">{a.student?.name}</div>
                                <div className="ga-student-sub">{a.student?.github_username}</div>
                              </td>
                              <td>{a.blueprint?.title}</td>
                              <td>
                                <span className={`ga-status ga-status--${a.status}`}>{a.status}</span>
                              </td>
                              <td>{stat?.total_commits ?? "—"}</td>
                              <td>{stat?.active_days ?? "—"}</td>
                              <td>{stat ? <span className={stat.late_start ? "ga-flag-yes" : "ga-flag-no"}>{stat.late_start ? "Yes" : "No"}</span> : "—"}</td>
                              <td>{stat ? <span className={stat.one_day_spike ? "ga-flag-yes" : "ga-flag-no"}>{stat.one_day_spike ? "Yes" : "No"}</span> : "—"}</td>
                              <td>
                                {flags.filter((f) => f.type === "warning").length > 0 ? (
                                  <div className="ga-flags">
                                    {flags
                                      .filter((f) => f.type === "warning")
                                      .map((f, i) => (
                                        <span key={i} className="ga-flag-badge">
                                          {f.name}
                                        </span>
                                      ))}
                                  </div>
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td>
                                <span className="ga-expand-btn">{isExpanded ? "▲" : "▼"}</span>
                              </td>
                            </tr>

                            {isExpanded && (
                              <tr key={`${a.id}-expanded`}>
                                <td colSpan={9} className="ga-expanded-cell">
                                  <div className="ga-expanded-section">
                                    <div className="ga-expanded-title">Commits</div>
                                    {loadingCommits ? (
                                      <p className="ga-empty">Loading commits...</p>
                                    ) : rowCommits.length === 0 ? (
                                      <p className="ga-empty">No commits found.</p>
                                    ) : (
                                      <div className="ga-commits-list">
                                        {rowCommits.map((commit) => (
                                          <div key={commit.commit_sha}>
                                            <div
                                              className="ga-commit-row"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleExpandCommit(a.id, commit);
                                              }}
                                            >
                                              <div className="ga-commit-left">
                                                <span className="ga-commit-sha">{commit.commit_sha?.slice(0, 7)}</span>
                                                <span className="ga-commit-message">{commit.commit_message?.split("\n")[0]}</span>
                                              </div>
                                              <div className="ga-commit-right">
                                                <span className="ga-commit-date">{commit.commit_author_date?.slice(0, 10)}</span>
                                                <span className="ga-expand-btn">{expandedCommit === commit.commit_sha ? "▲" : "▼"}</span>
                                              </div>
                                            </div>

                                            {expandedCommit === commit.commit_sha && (
                                              <div className="ga-commit-detail">
                                                {loadingCommit === commit.commit_sha ? (
                                                  <p className="ga-empty">Loading...</p>
                                                ) : commitDetail[commit.commit_sha] ? (
                                                  <>
                                                    <div className="ga-commit-stats">
                                                      <span className="ga-additions">+{commitDetail[commit.commit_sha].stats_additions}</span>
                                                      <span className="ga-deletions">-{commitDetail[commit.commit_sha].stats_deletions}</span>
                                                      <span className="ga-commit-sub">{commitDetail[commit.commit_sha].stats_total_changes} changes</span>
                                                    </div>
                                                    <div className="ga-files-list">
                                                      {commitDetail[commit.commit_sha].files_changed?.map((f, i) => (
                                                        <div key={i} className="ga-file-row">
                                                          <span className="ga-file-status">{f.status}</span>
                                                          <span className="ga-file-name">{f.filename}</span>
                                                          <span className="ga-additions">+{f.additions}</span>
                                                          <span className="ga-deletions">-{f.deletions}</span>
                                                        </div>
                                                      ))}
                                                    </div>
                                                    <a href={commit.commit_html_url} target="_blank" rel="noreferrer" className="ga-view-commit-btn" onClick={(e) => e.stopPropagation()}>
                                                      View commit on GitHub →
                                                    </a>
                                                  </>
                                                ) : null}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  <div className="ga-expanded-section">
                                    <div className="ga-expanded-title">Flags detail</div>
                                    {flags.length === 0 ? (
                                      <p className="ga-empty">No flags generated.</p>
                                    ) : (
                                      <div className="ga-flags-detail">
                                        {flags.map((f, i) => (
                                          <div key={i} className={`ga-flag-detail-row ga-flag-detail--${f.type}`}>
                                            <div className="ga-flag-detail-header">
                                              <span className={`ga-flag-type ga-flag-type--${f.type}`}>{f.type}</span>
                                              <span className="ga-flag-detail-name">{f.name}</span>
                                            </div>
                                            <p className="ga-flag-detail-desc">{f.description}</p>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {noAssignment.length > 0 && (
              <div className="ga-section">
                <h2>Students with no project</h2>
                <div className="ga-no-assignment">
                  {noAssignment.map((s) => (
                    <div key={s.id} className="ga-student-card">
                      <div className="ga-student-name">{s.name}</div>
                      <div className="ga-student-sub">
                        {s.email} · Series {s.series} · Group {s.group_number}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default GitAnalysis;
