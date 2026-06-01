import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import Navbar from "../components/Navbar";
import "./StudentCourseDetail.css";

const StudentCourseDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [blueprints, setBlueprints] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openWeeks, setOpenWeeks] = useState({});
  const [joining, setJoining] = useState(null);
  const [repoUrl, setRepoUrl] = useState("");
  const [showSubmit, setShowSubmit] = useState(false);
  const [submittingId, setSubmittingId] = useState(null);
  const [submitUrl, setSubmitUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchAll = async () => {
    try {
      const [courseRes, docsRes, bpRes, assignRes] = await Promise.all([api.get(`/courses/${id}`), api.get(`/documents/${id}/documents`), api.get(`/blueprints/course/${id}/available`), api.get(`/assignments/mine`)]);
      setCourse(courseRes.data);
      setDocuments(docsRes.data);
      setBlueprints(bpRes.data);
      setAssignments(assignRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [id]);

  const getWeeks = () => {
    if (!course?.start_date || !course?.end_date) return [];
    const start = new Date(course.start_date);
    const end = new Date(course.end_date);
    const totalWeeks = Math.ceil((end - start) / (7 * 24 * 60 * 60 * 1000));
    return Array.from({ length: totalWeeks }, (_, i) => i + 1);
  };

  const getDocsForWeek = (week) => documents.filter((d) => d.week_number === week);

  const toggleWeek = (week) => setOpenWeeks((prev) => ({ ...prev, [week]: !prev[week] }));

  const isJoined = (blueprintId) => assignments.some((a) => a.blueprint_id === blueprintId);

  const handleJoin = async (blueprintId) => {
    setJoining(blueprintId);
    try {
      await api.post(`/blueprints/${blueprintId}/join`);
      fetchAll();
    } catch (err) {
      console.error(err);
    } finally {
      setJoining(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.patch(`/assignments/${submittingId}/submit`, { repo_url: submitUrl });
      setShowSubmit(false);
      setSubmitUrl("");
      setSubmittingId(null);
      fetchAll();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const getAssignment = (blueprintId) => assignments.find((a) => a.blueprint_id === blueprintId);

  if (loading)
    return (
      <div className="page">
        <Navbar />
      </div>
    );

  const weeks = getWeeks();

  return (
    <div className="page">
      <Navbar />
      <div className="page-content">
        <div className="course-header">
          <div className="course-header-left">
            <span className="course-badge">{course?.type}</span>
            <h1>{course?.subject?.name}</h1>
            <p>
              {course?.series} · {course?.university_year} · {course?.start_date} → {course?.end_date}
            </p>
          </div>
        </div>

        {blueprints.length > 0 && (
          <div className="student-blueprints">
            <h2>Available blueprints</h2>
            <div className="blueprints-grid">
              {blueprints.map((bp) => {
                const assignment = getAssignment(bp.id);
                return (
                  <div key={bp.id} className="student-bp-card">
                    <div className="student-bp-top">
                      <span className={`bp-difficulty bp-difficulty--${bp.difficulty}`}>{bp.difficulty}</span>
                      <span className="bp-domain">{bp.domain}</span>
                    </div>
                    <h3>{bp.title}</h3>
                    <p>{bp.content?.context_description}</p>
                    <div className="student-bp-footer">
                      {!assignment ? (
                        <button className="btn-primary" onClick={() => handleJoin(bp.id)} disabled={joining === bp.id}>
                          {joining === bp.id ? "Joining..." : "Join project"}
                        </button>
                      ) : (
                        <div className="assignment-status">
                          <span className={`assign-status assign-status--${assignment.status}`}>{assignment.status}</span>
                          {assignment.status === "in_progress" && (
                            <button
                              className="btn-accent"
                              onClick={() => {
                                setSubmittingId(assignment.id);
                                setShowSubmit(true);
                              }}
                            >
                              Submit repo
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {showSubmit && (
          <div className="modal-overlay" onClick={() => setShowSubmit(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>Submit repository</h2>
              <form onSubmit={handleSubmit} className="modal-form">
                <div className="field">
                  <label>GitHub repository URL</label>
                  <input type="text" placeholder="https://github.com/username/repo" value={submitUrl} onChange={(e) => setSubmitUrl(e.target.value)} required />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn-ghost" onClick={() => setShowSubmit(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={submitting}>
                    {submitting ? "Submitting..." : "Submit"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="weeks-list">
          {weeks.map((week) => {
            const docs = getDocsForWeek(week);
            const isOpen = openWeeks[week];
            return (
              <div key={week} className="week-item">
                <div className="week-header" onClick={() => toggleWeek(week)}>
                  <div className="week-title">
                    <span className="week-number">Week {week}</span>
                    <span className="week-doc-count">
                      {docs.length} document{docs.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <span className="week-arrow">{isOpen ? "▲" : "▼"}</span>
                </div>
                {isOpen && (
                  <div className="week-docs">
                    {docs.length === 0 ? (
                      <p className="no-docs">No documents for this week yet.</p>
                    ) : (
                      docs.map((doc) => (
                        <div key={doc.id} className="doc-item">
                          <div className="doc-info">
                            <span className="doc-type">{doc.file_type}</span>
                            <span className="doc-name">{doc.filename}</span>
                          </div>
                          <a href={`http://localhost:3000/api/documents/${doc.id}/download?token=${JSON.parse(localStorage.getItem("peercode_user"))?.token}`} className="doc-download" target="_blank" rel="noreferrer">
                            Download
                          </a>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StudentCourseDetail;
