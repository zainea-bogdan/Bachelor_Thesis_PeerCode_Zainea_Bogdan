import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import Navbar from "../components/Navbar";
import CommentThread from "../components/CommentThread";
import "./StudentDashboard.css";

const StudentDashboard = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState("all");

  const fetchAssignments = async () => {
    try {
      const res = await api.get("/assignments/mine");
      setAssignments(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const parseGrade = (teacherNote) => {
    if (!teacherNote) return null;
    const match = teacherNote.match(/\[Grade: (\d+)\/10\]/);
    return match ? match[1] : null;
  };

  const parseNote = (teacherNote) => {
    if (!teacherNote) return null;
    return teacherNote.replace(/\[Grade: \d+\/10\]\s*/, "");
  };

  const courses = [...new Set(assignments.map((a) => a.blueprint?.course_id))];

  const filtered = selectedCourse === "all" ? assignments : assignments.filter((a) => a.blueprint?.course_id === selectedCourse);

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="page">
      <Navbar />
      <div className="page-content">
        <div className="page-header">
          <div>
            <h1>My Projects</h1>
            <p>Your assignments, analytics and feedback</p>
          </div>
        </div>

        {loading ? (
          <p className="sd-empty">Loading your projects...</p>
        ) : assignments.length === 0 ? (
          <div className="sd-empty-state">
            <p>You haven't joined any projects yet. Browse your courses to get started.</p>
          </div>
        ) : (
          <>
            <div className="sd-assignments">
              {filtered.map((a) => {
                const stat = a.git_analysis_statistics?.[0];
                const flags = stat?.summary?.flags || [];
                const warningFlags = flags.filter((f) => f.type === "warning");
                const grade = parseGrade(a.teacher_note);
                const note = parseNote(a.teacher_note);
                const isExpanded = expandedId === a.id;

                return (
                  <div key={a.id} className="sd-card">
                    <div className="sd-card-header" onClick={() => toggleExpand(a.id)}>
                      <div className="sd-card-left">
                        <div className="sd-card-top">
                          <span className={`sd-difficulty sd-difficulty--${a.blueprint?.difficulty}`}>{a.blueprint?.difficulty}</span>
                          <span className="sd-domain">{a.blueprint?.domain}</span>
                        </div>
                        <h3 className="sd-title">{a.blueprint?.title}</h3>
                        <div className="sd-meta">
                          <span className={`sd-status sd-status--${a.status}`}>{a.status}</span>
                          {stat && (
                            <>
                              <span className="sd-meta-item">{stat.total_commits} commits</span>
                              <span className="sd-meta-item">{stat.active_days} active days</span>
                              {warningFlags.length > 0 && (
                                <span className="sd-meta-warning">
                                  {warningFlags.length} warning{warningFlags.length > 1 ? "s" : ""}
                                </span>
                              )}
                            </>
                          )}
                          {grade && <span className="sd-grade-badge">Grade: {grade}/10</span>}
                        </div>
                      </div>
                      <span className="sd-expand-btn">{isExpanded ? "▲" : "▼"}</span>
                    </div>

                    {isExpanded && (
                      <div className="sd-card-body">
                        {stat && (
                          <div className="sd-section">
                            <div className="sd-section-title">My analytics</div>
                            <div className="sd-stats-grid">
                              <div className="sd-stat">
                                <div className="sd-stat-value">{stat.total_commits}</div>
                                <div className="sd-stat-label">Total commits</div>
                              </div>
                              <div className="sd-stat">
                                <div className="sd-stat-value">{stat.active_days}</div>
                                <div className="sd-stat-label">Active days</div>
                              </div>
                              <div className="sd-stat">
                                <div className="sd-stat-value">{stat.summary?.metrics?.window_utilization_ratio ? `${Math.round(stat.summary.metrics.window_utilization_ratio * 100)}%` : "—"}</div>
                                <div className="sd-stat-label">Window utilization</div>
                              </div>
                              <div className="sd-stat">
                                <div className="sd-stat-value">{stat.summary?.metrics?.largest_inactivity_gap_days ?? "—"}</div>
                                <div className="sd-stat-label">Longest gap (days)</div>
                              </div>
                            </div>

                            {warningFlags.length > 0 && (
                              <div className="sd-flags">
                                {warningFlags.map((f, i) => (
                                  <div key={i} className="sd-flag-item">
                                    <span className="sd-flag-name">{f.name}</span>
                                    <p className="sd-flag-desc">{f.description}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {a.status === "reviewed" && note && (
                          <div className="sd-section">
                            <div className="sd-section-title">Teacher feedback</div>
                            <div className="sd-feedback">
                              {grade && (
                                <div className="sd-grade-display">
                                  <span className="sd-grade-number">{grade}</span>
                                  <span className="sd-grade-denom">/10</span>
                                </div>
                              )}
                              <p className="sd-note">{note}</p>
                            </div>
                          </div>
                        )}

                        <div className="sd-section">
                          <div className="sd-section-title">Comments</div>
                          <CommentThread assignmentId={a.id} currentUser={user} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
