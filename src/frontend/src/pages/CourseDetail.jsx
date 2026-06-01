import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";
import Navbar from "../components/Navbar";
import "./CourseDetail.css";
import BlueprintCard from "../components/BlueprintCard";

const CourseDetail = () => {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openWeeks, setOpenWeeks] = useState({});
  const [uploadingWeek, setUploadingWeek] = useState(null);
  const [showGenerate, setShowGenerate] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    context: "",
    domain: "",
    projects_count: 1,
    difficulty_per_slot: ["medium"],
  });
  const [blueprints, setBlueprints] = useState([]);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({});

  const fetchCourse = async () => {
    try {
      const res = await api.get(`/courses/${id}`);
      setCourse(res.data);
      setEditForm({
        university_year: res.data.university_year,
        series: res.data.series || "",
        type: res.data.type,
        start_date: res.data.start_date,
        end_date: res.data.end_date,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const res = await api.get(`/documents/${id}/documents`);
      setDocuments(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBlueprints = async () => {
    try {
      const res = await api.get(`/blueprints/course/${id}`);
      setBlueprints(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCourse();
    fetchDocuments();
    fetchBlueprints();
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

  const handleUpload = async (week, file) => {
    if (!file) return;
    setUploadingWeek(week);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("course_id", id);
      formData.append("week_number", week);
      await api.post("/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      fetchDocuments();
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingWeek(null);
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm("Delete this document?")) return;
    try {
      await api.delete(`/documents/${docId}`);
      fetchDocuments();
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const res = await api.post("/blueprints/generate", {
        course_id: id,
        course_name: course?.subject?.name,
        context: generateForm.context,
        domain: generateForm.domain,
        projects_count: parseInt(generateForm.projects_count),
        difficulty_per_slot: Array.from({ length: parseInt(generateForm.projects_count) }, () => generateForm.difficulty_per_slot[0]),
        start_date: course?.start_date,
        deadline: course?.end_date,
      });
      setBlueprints(res.data.blueprints);
      setShowGenerate(false);
      fetchBlueprints();
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const handleConfirm = async (blueprintId) => {
    try {
      await api.patch(`/blueprints/${blueprintId}/confirm`);
      fetchBlueprints();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssign = async (blueprintId) => {
    try {
      await api.patch(`/blueprints/${blueprintId}/assign`);
      fetchBlueprints();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnassign = async (blueprintId) => {
    try {
      await api.patch(`/blueprints/${blueprintId}/unassign`);
      fetchBlueprints();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnconfirm = async (blueprintId) => {
    try {
      await api.patch(`/blueprints/${blueprintId}/unconfirm`);
      fetchBlueprints();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditCourse = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/courses/${id}`, editForm);
      setShowEdit(false);
      fetchCourse();
    } catch (err) {
      console.error(err);
    }
  };

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
          <button className="btn-ghost" onClick={() => setShowEdit(true)}>
            Edit course
          </button>
        </div>

        {showEdit && (
          <div className="modal-overlay" onClick={() => setShowEdit(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>Edit course</h2>
              <form onSubmit={handleEditCourse} className="modal-form">
                <div className="field">
                  <label>Year</label>
                  <input type="text" value={editForm.university_year} onChange={(e) => setEditForm({ ...editForm, university_year: e.target.value })} required />
                </div>
                <div className="field">
                  <label>Series</label>
                  <input type="text" value={editForm.series} onChange={(e) => setEditForm({ ...editForm, series: e.target.value })} />
                </div>
                <div className="field">
                  <label>Type</label>
                  <select value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}>
                    <option value="course">Course</option>
                    <option value="seminar">Seminar</option>
                    <option value="lab">Lab</option>
                  </select>
                </div>
                <div className="field">
                  <label>Start date</label>
                  <input type="date" value={editForm.start_date} onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })} required />
                </div>
                <div className="field">
                  <label>End date</label>
                  <input type="date" value={editForm.end_date} onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })} required />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn-ghost" onClick={() => setShowEdit(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Save changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <button className="btn-generate" onClick={() => setShowGenerate(true)}>
          Generate blueprint
        </button>

        {blueprints.length > 0 && (
          <div className="blueprints-section">
            <h2>Blueprints</h2>
            <div className="blueprints-grid">
              {blueprints.map((bp) => (
                <BlueprintCard key={bp.id} bp={bp} onConfirm={handleConfirm} onAssign={handleAssign} onUnassign={handleUnassign} onUnconfirm={handleUnconfirm} onUpdate={fetchBlueprints} />
              ))}
            </div>
          </div>
        )}

        {showGenerate && (
          <div className="modal-overlay" onClick={() => setShowGenerate(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>Generate blueprint</h2>
              <form onSubmit={handleGenerate} className="modal-form">
                <div className="field">
                  <label>Domain</label>
                  <input type="text" placeholder="e.g. Web Development" value={generateForm.domain} onChange={(e) => setGenerateForm({ ...generateForm, domain: e.target.value })} required />
                </div>
                <div className="field">
                  <label>Context</label>
                  <textarea placeholder="Describe what the project should cover..." value={generateForm.context} onChange={(e) => setGenerateForm({ ...generateForm, context: e.target.value })} rows={4} required />
                </div>
                <div className="field">
                  <label>Number of projects</label>
                  <input type="number" min="1" max="5" value={generateForm.projects_count} onChange={(e) => setGenerateForm({ ...generateForm, projects_count: e.target.value })} required />
                </div>
                <div className="field">
                  <label>Difficulty</label>
                  <select value={generateForm.difficulty_per_slot[0]} onChange={(e) => setGenerateForm({ ...generateForm, difficulty_per_slot: [e.target.value] })}>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn-ghost" onClick={() => setShowGenerate(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-accent" disabled={generating}>
                    {generating ? "Generating..." : "Generate"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="weeks-list">
          {weeks.length === 0 ? (
            <div className="empty-state">
              <p>No weeks available. Make sure the course has start and end dates.</p>
            </div>
          ) : (
            weeks.map((week) => {
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
                              <span className={`doc-status ${doc.is_indexed ? "indexed" : "not-indexed"}`}>{doc.is_indexed ? "indexed" : "not indexed"}</span>
                            </div>
                            <div className="doc-actions">
                              <a href={`http://localhost:3000/api/documents/${doc.id}/download?token=${JSON.parse(localStorage.getItem("peercode_user"))?.token}`} className="doc-download" target="_blank" rel="noreferrer">
                                Download
                              </a>
                              <button className="doc-delete" onClick={() => handleDelete(doc.id)}>
                                Delete
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                      <label className="upload-btn">
                        {uploadingWeek === week ? "Uploading..." : "+ Add document"}
                        <input type="file" accept=".pdf,.docx,.pptx" style={{ display: "none" }} onChange={(e) => handleUpload(week, e.target.files[0])} disabled={uploadingWeek === week} />
                      </label>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;
