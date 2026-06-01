import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import TeacherDashboard from "./pages/TeacherDashboard";
import CourseDetail from "./pages/CourseDetail";
import StudentCourses from "./pages/StudentCourses";
import StudentCourseDetail from "./pages/StudentCourseDetail";
import GitAnalysis from "./pages/GitAnalysis";

const App = () => {
  const { loading } = useAuth();
  if (loading) return null;

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<TeacherDashboard />} />
      <Route path="/courses/:id" element={<CourseDetail />} />
      <Route path="*" element={<Navigate to="/login" />} />
      <Route path="/courses" element={<StudentCourses />} />
      <Route path="/student/courses/:id" element={<StudentCourseDetail />} />
      <Route path="/analytics" element={<GitAnalysis />} />
    </Routes>
  );
};

export default App;
