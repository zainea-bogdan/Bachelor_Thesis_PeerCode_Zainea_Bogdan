import { useState } from "react";
import api from "../services/api";
import { useNavigate, Link } from "react-router-dom";
import "./Login.css";

const Register = () => {
  const [role, setRole] = useState("student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [githubUsername, setGithubUsername] = useState("");
  const [university, setUniversity] = useState("");
  const [speciality, setSpeciality] = useState("");
  const [year, setYear] = useState("");
  const [series, setSeries] = useState("");
  const [groupNumber, setGroupNumber] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/register", {
        name,
        email,
        password,
        role,
        github_username: githubUsername,
        university,
        speciality,
        year: year ? parseInt(year) : null,
        series,
        group_number: groupNumber,
      });
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.error || "Connection error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-brand">
          <span className="brand-dot">P</span>
          <span>PeerCode</span>
        </div>

        <h1 className="login-title">Create account</h1>
        <p className="login-sub">Join PeerCode</p>

        <div className="role-toggle">
          <button className={`role-btn ${role === "student" ? "active" : ""}`} onClick={() => setRole("student")} type="button">
            Student
          </button>
          <button className={`role-btn ${role === "teacher" ? "active" : ""}`} onClick={() => setRole("teacher")} type="button">
            Teacher
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="field">
            <label>Full name</label>
            <input type="text" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" placeholder="you@university.ro" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          {role === "student" && (
            <>
              <div className="field">
                <label>GitHub username</label>
                <input type="text" placeholder="github-username" value={githubUsername} onChange={(e) => setGithubUsername(e.target.value)} />
              </div>
              <div className="field">
                <label>University</label>
                <input type="text" placeholder="e.g. ASE Bucharest" value={university} onChange={(e) => setUniversity(e.target.value)} />
              </div>
              <div className="field">
                <label>Speciality</label>
                <input type="text" placeholder="e.g. Computer Science" value={speciality} onChange={(e) => setSpeciality(e.target.value)} />
              </div>
              <div className="field">
                <label>Year</label>
                <input type="number" min="1" max="6" placeholder="e.g. 2" value={year} onChange={(e) => setYear(e.target.value)} />
              </div>
              <div className="field">
                <label>Series</label>
                <input type="text" placeholder="e.g. A" value={series} onChange={(e) => setSeries(e.target.value)} />
              </div>
              <div className="field">
                <label>Group number</label>
                <input type="text" placeholder="e.g. 1" value={groupNumber} onChange={(e) => setGroupNumber(e.target.value)} />
              </div>
            </>
          )}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="login-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
