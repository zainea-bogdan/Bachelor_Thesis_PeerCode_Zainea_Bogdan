import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import Navbar from "../components/Navbar";
import "./TeacherDashboard.css";

const TeacherDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showCreateSubject, setShowCreateSubject] = useState(false);
  const [form, setForm] = useState({
    subject_id: "",
    university_year: "",
    type: "course",
    series: "",
    start_date: "",
    end_date: "",
  });
  const [subjects, setSubjects] = useState([]);
  const [subjectName, setSubjectName] = useState("");
  const [error, setError] = useState("");

  const fetchCourses = async () => {
    try {
      const res = await api.get("/courses");
      setCourses(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await api.get("/subjects");
      setSubjects(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCourses();
    fetchSubjects();
  }, []);

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    try {
      await api.post("/subjects", { name: subjectName });
      setSubjectName("");
      setShowCreateSubject(false);
      fetchSubjects();
    } catch (err) {
      setError(err.response?.data?.error || "Error creating subject");
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/courses", form);
      setShowCreate(false);
      setForm({
        subject_id: "",
        university_year: "",
        type: "course",
        series: "",
        start_date: "",
        end_date: "",
      });
      fetchCourses();
    } catch (err) {
      setError(err.response?.data?.error || "Error creating course");
    }
  };

  return (
    <div className="page">
      <Navbar />
      <div className="page-content">
        <div className="page-header">
          <div>
            <h1>Welcome back, {user?.name}</h1>
            <p>Manage your courses and student projects</p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button className="btn-ghost" onClick={() => setShowCreateSubject(true)}>
              + New subject
            </button>
            <button className="btn-primary" onClick={() => setShowCreate(true)}>
              + New course
            </button>
          </div>
        </div>

        {showCreateSubject && (
          <div className="modal-overlay" onClick={() => setShowCreateSubject(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>Create subject</h2>
              <form onSubmit={handleCreateSubject} className="modal-form">
                <div className="field">
                  <label>Subject name</label>
                  <input type="text" placeholder="e.g. Data Structures" value={subjectName} onChange={(e) => setSubjectName(e.target.value)} required />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn-ghost" onClick={() => setShowCreateSubject(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showCreate && (
          <div className="modal-overlay" onClick={() => setShowCreate(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>Create course</h2>
              {error && <div className="error-banner">{error}</div>}
              <form onSubmit={handleCreate} className="modal-form">
                <div className="field">
                  <label>Subject</label>
                  <select value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })} required>
                    <option value="">Select subject</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Year</label>
                  <input type="text" placeholder="2024-2025" value={form.university_year} onChange={(e) => setForm({ ...form, university_year: e.target.value })} required />
                </div>
                <div className="field">
                  <label>Type</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    <option value="course">Course</option>
                    <option value="seminar">Seminar</option>
                  </select>
                </div>
                <div className="field">
                  <label>Series</label>
                  <input type="text" placeholder="A" value={form.series} onChange={(e) => setForm({ ...form, series: e.target.value })} />
                </div>
                <div className="field">
                  <label>Start date</label>
                  <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
                </div>
                <div className="field">
                  <label>End date</label>
                  <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} required />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn-ghost" onClick={() => setShowCreate(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {loading ? (
          <p className="loading-text">Loading courses...</p>
        ) : courses.length === 0 ? (
          <div className="empty-state">
            <p>No courses yet. Create your first course to get started.</p>
          </div>
        ) : (
          <div className="courses-grid">
            {courses.map((course) => (
              <div key={course.id} className="course-card" onClick={() => navigate(`/courses/${course.id}`)}>
                <div className="course-badge">{course.type}</div>
                <h3>{course.subject?.name || "Course"}</h3>
                <p>
                  <p>
                    {course.series} · {course.university_year}
                  </p>
                </p>
                <div className="course-footer">
                  <span>{course.course_code}</span>
                  <span className="arrow">→</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;
