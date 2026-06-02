import { useAuth } from "../context/AuthContext";
import { NavLink, useNavigate } from "react-router-dom";
import "./Navbar.css";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <div className="nav-inner">
        <div className="nav-brand">
          <span className="brand-dot">P</span>
          <span>PeerCode</span>
        </div>

        <div className="nav-links">
          {user?.role === "teacher" && (
            <>
              <NavLink to="/dashboard" className="nav-link">
                Courses
              </NavLink>
              <NavLink to="/analytics" className="nav-link">
                Git Analysis
              </NavLink>
            </>
          )}
          {user?.role === "student" && (
            <>
              <NavLink to="/courses" className="nav-link">
                My Courses
              </NavLink>
              <NavLink to="/my-projects" className="nav-link">
                My Projects
              </NavLink>
            </>
          )}
        </div>

        <div className="nav-right">
          <span className="nav-username">{user?.name}</span>
          <span className="nav-role">{user?.role}</span>
          <button className="nav-logout" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
