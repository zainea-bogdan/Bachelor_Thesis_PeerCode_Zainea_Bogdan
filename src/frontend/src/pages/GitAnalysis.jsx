import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import Navbar from "../components/Navbar";
import CommentThread from "../components/CommentThread";
import "./GitAnalysis.css";

const GitAnalysis = () => {
  const { user } = useAuth();
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
  const [showGrade, setShowGrade] = useState(false);
  const [gradingAssignment, setGradingAssignment] = useState(null);
  const [teacherNote, setTeacherNote] = useState("");
  const [grade, setGrade] = useState("");
  const [grading, setGrading] = useState(false);

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

  const handleMarkReview = async (assignmentId) => {
    try {
      await api.patch(`/assignments/${assignmentId}/review`);
      fetchAnalytics();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEvaluate = async (e) => {
    e.preventDefault();
    setGrading(true);
    try {
      await api.patch(`/assignments/${gradingAssignment.id}/evaluate`, {
        teacher_note: `[Grade: ${grade}/10] ${teacherNote}`,
      });
      setShowGrade(false);
      setTeacherNote("");
      setGrade("");
      setGradingAssignment(null);
      fetchAnalytics();
    } catch (err) {
      console.error(err);
    } finally {
      setGrading(false);
    }
  };

  const closeGradeModal = () => {
    setShowGrade(false);
    setTeacherNote("");
    setGrade("");
    setGradingAssignment(null);
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
                        <th>Flags</th>
                        <th>Grade</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.map((a) => {
                        const stat = a.git_analysis_statistics?.[0];
                        const isExpanded = expandedRow === a.id;
                        const rowCommits = commits[a.id] || [];
                        const flags = stat?.summary?.flags || [];
                        const warningCount = flags.filter((f) => f.type === "warning").length;

                        return (
                          <>
                            <tr key={a.id} className="ga-row" onClick={() => handleExpandRow(a)} style={{ cursor: "pointer" }}>
                              <td>
                                <div className="ga-student-name">{a.student?.name}</div>
                                <div className="ga-student-sub">{a.student?.github_username}</div>
                              </td>
                              <td className="ga-blueprint-cell">{a.blueprint?.title}</td>
                              <td>
                                <span className={`ga-status ga-status--${a.status}`}>{a.status}</span>
                              </td>
                              <td className="ga-center">{stat?.total_commits ?? "—"}</td>
                              <td className="ga-center">{stat?.active_days ?? "—"}</td>
                              <td>
                                {warningCount > 0 ? (
                                  <span className="ga-flag-count">
                                    {warningCount} warning{warningCount > 1 ? "s" : ""}
                                  </span>
                                ) : (
                                  <span className="ga-flag-none">None</span>
                                )}
                              </td>
                              <td onClick={(e) => e.stopPropagation()}>
                                {a.status === "submitted" && (
                                  <button className="ga-grade-btn ga-grade-btn--review" onClick={() => handleMarkReview(a.id)}>
                                    Mark review
                                  </button>
                                )}
                                {a.status === "under_review" && (
                                  <button
                                    className="ga-grade-btn ga-grade-btn--evaluate"
                                    onClick={() => {
                                      setGradingAssignment(a);
                                      setShowGrade(true);
                                    }}
                                  >
                                    Evaluate
                                  </button>
                                )}
                                {a.status === "reviewed" && (
                                  <div className="ga-reviewed-cell">
                                    <span className="ga-reviewed-note">✓ Reviewed</span>
                                    <button
                                      className="ga-grade-btn ga-grade-btn--review"
                                      onClick={() => {
                                        setGradingAssignment(a);
                                        setShowGrade(true);
                                      }}
                                    >
                                      Re-evaluate
                                    </button>
                                  </div>
                                )}
                              </td>
                              <td className="ga-center">
                                <span className="ga-expand-btn">{isExpanded ? "▲" : "▼"}</span>
                              </td>
                            </tr>

                            {isExpanded && (
                              <tr key={`${a.id}-expanded`}>
                                <td colSpan={8} className="ga-expanded-cell">
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

                                  <div className="ga-expanded-section">
                                    <div className="ga-expanded-title">Comments</div>
                                    <CommentThread assignmentId={a.id} currentUser={user} />
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

      {showGrade && (
        <div className="modal-overlay" onClick={closeGradeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Evaluate assignment</h2>
            <p style={{ fontSize: "14px", color: "#8C6A50", marginBottom: "20px" }}>
              Student: <strong>{gradingAssignment?.student?.name}</strong>
            </p>
            <form onSubmit={handleEvaluate} className="modal-form">
              <div className="field">
                <label>Grade (1–10)</label>
                <input type="number" min="1" max="10" placeholder="e.g. 8" value={grade} onChange={(e) => setGrade(e.target.value)} required style={{ padding: "10px 14px", border: "1px solid #D4B896", borderRadius: "8px", background: "#FAF5EF", color: "#2C1A0E", fontSize: "14px", outline: "none" }} />
              </div>
              <div className="field">
                <label>Teacher note</label>
                <textarea placeholder="Leave feedback for the student..." value={teacherNote} onChange={(e) => setTeacherNote(e.target.value)} rows={4} required style={{ width: "100%", padding: "10px 14px", border: "1px solid #D4B896", borderRadius: "8px", background: "#FAF5EF", color: "#2C1A0E", fontSize: "14px", outline: "none", resize: "vertical", fontFamily: "inherit" }} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={closeGradeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={grading}>
                  {grading ? "Saving..." : "Submit evaluation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GitAnalysis;
