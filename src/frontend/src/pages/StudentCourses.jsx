import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import Navbar from "../components/Navbar";
import "./StudentCourses.css";

const StudentCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showJoin, setShowJoin] = useState(false);
  const [courseCode, setCourseCode] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState("");
  const navigate = useNavigate();

  const fetchCourses = async () => {
    try {
      const res = await api.get("/courses/enrolled");
      setCourses(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleSelfEnroll = async (e) => {
    e.preventDefault();
    setEnrolling(true);
    setEnrollError("");
    try {
      await api.post("/courses/join", { course_code: courseCode });
      setCourseCode("");
      setShowJoin(false);
      fetchCourses();
    } catch (err) {
      setEnrollError(err.response?.data?.error || "Invalid course code");
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <div className="page">
      <Navbar />
      <div className="page-content">
        <div className="page-header">
          <div>
            <h1>My Courses</h1>
            <p>Your enrolled courses</p>
          </div>
          <button className="btn-primary" onClick={() => setShowJoin(true)}>
            + Join a course
          </button>
        </div>

        {showJoin && (
          <div className="modal-overlay" onClick={() => setShowJoin(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>Join a course</h2>
              <p style={{ fontSize: "14px", color: "#8C6A50", marginBottom: "20px" }}>Enter the course code provided by your teacher.</p>
              {enrollError && <div className="error-banner">{enrollError}</div>}
              <form onSubmit={handleSelfEnroll} className="modal-form">
                <div className="field">
                  <label>Course code</label>
                  <input type="text" placeholder="e.g. AB12CD" value={courseCode} onChange={(e) => setCourseCode(e.target.value.toUpperCase())} required />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn-ghost" onClick={() => setShowJoin(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={enrolling}>
                    {enrolling ? "Joining..." : "Join"}
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
            <p>You are not enrolled in any courses yet. Use a course code to join one.</p>
          </div>
        ) : (
          <div className="courses-grid">
            {courses.map((enrollment) => (
              <div key={enrollment.id} className="course-card" onClick={() => navigate(`/student/courses/${enrollment.course.id}`)}>
                <div className="course-badge">{enrollment.course.type}</div>
                <h3>{enrollment.course.subject?.name || "Course"}</h3>
                <p>
                  {enrollment.course.series} · {enrollment.course.university_year}
                </p>
                <div className="course-footer">
                  <span>{enrollment.course.course_code}</span>
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

export default StudentCourses;
