const sequelize = require("../sequelize");

const Teacher = require("./Teacher");
const Student = require("./Student");
const Subject = require("./Subject");
const Course = require("./Course");
const Document = require("./Document");
const Blueprint = require("./Blueprint");
const CourseEnrollment = require("./CourseEnrollment");
const BlueprintAssignment = require("./BlueprintAssignment");
const GitAnalysisStatistics = require("./GitAnalysisStatistics");
const Comment = require("./Comment");
const Notification = require("./Notification");

//  asocierile profului
Teacher.hasMany(Course, { foreignKey: "teacher_id", onDelete: "RESTRICT" });
Teacher.hasMany(Document, { foreignKey: "teacher_id", onDelete: "RESTRICT" });
Teacher.hasMany(Blueprint, { foreignKey: "teacher_id", onDelete: "RESTRICT" });

// asocierile studentilor
Student.belongsToMany(Course, {
  through: CourseEnrollment,
  foreignKey: "student_id",
  otherKey: "course_id",
  as: "enrolledCourses",
});
Student.hasMany(BlueprintAssignment, { foreignKey: "student_id", onDelete: "RESTRICT" });
Student.hasMany(CourseEnrollment, { foreignKey: "student_id" });

// asocierea dintre materie predata si cursul propriu zis al unui profesor la materia respectiva
Subject.hasMany(Course, { foreignKey: "subject_id", onDelete: "RESTRICT" });

// asocierile dintre curs si profe, stud, doc,blueprint si enrollments.
Course.belongsTo(Teacher, { foreignKey: "teacher_id" });
Course.belongsTo(Subject, { foreignKey: "subject_id" });
Course.hasMany(Document, { foreignKey: "course_id", onDelete: "RESTRICT" });
Course.hasMany(Blueprint, { foreignKey: "course_id", onDelete: "RESTRICT" });
Course.belongsToMany(Student, {
  through: CourseEnrollment,
  foreignKey: "course_id",
  otherKey: "student_id",
  as: "enrolledStudents",
});
Course.hasMany(CourseEnrollment, { foreignKey: "course_id" });

// asocierile dintre document si courses+prof ( ca fiecare prof isi pune documente pentru o materie la un anumit curs )
Document.belongsTo(Course, { foreignKey: "course_id" });
Document.belongsTo(Teacher, { foreignKey: "teacher_id" });

// asocierile blueprintului
Blueprint.belongsTo(Course, { foreignKey: "course_id" });
Blueprint.belongsTo(Teacher, { foreignKey: "teacher_id" });
Blueprint.hasMany(BlueprintAssignment, {
  foreignKey: "blueprint_id",
  onDelete: "RESTRICT",
});

// asocierile ptr course enrollment
CourseEnrollment.belongsTo(Course, { foreignKey: "course_id" });
CourseEnrollment.belongsTo(Student, { foreignKey: "student_id" });

// asocierile pentru blueprintassigment
BlueprintAssignment.belongsTo(Blueprint, { foreignKey: "blueprint_id" });
BlueprintAssignment.belongsTo(Student, { foreignKey: "student_id" });
BlueprintAssignment.hasMany(GitAnalysisStatistics, {
  foreignKey: "assignment_id",
  onDelete: "CASCADE",
});
BlueprintAssignment.hasMany(Comment, {
  foreignKey: "assignment_id",
  onDelete: "CASCADE",
});

// asocierile pentru git analysis statistics
GitAnalysisStatistics.belongsTo(BlueprintAssignment, { foreignKey: "assignment_id" });

// asocieri comment
Comment.belongsTo(BlueprintAssignment, { foreignKey: "assignment_id" });

// ne asiguram ca exportan aceste modele ca ele sa poata fi folosite.
module.exports = {
  sequelize,
  Teacher,
  Student,
  Subject,
  Course,
  Document,
  Blueprint,
  CourseEnrollment,
  BlueprintAssignment,
  GitAnalysisStatistics,
  Comment,
  Notification,
};
