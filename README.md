# Bachelor_Thesis_PeerCode_Zainea_Bogdan

This repo serves as the main documentation of my bachelor thesis,called PeerCode Studio, which is an AI-Assisted Educational Platform for Project Generation &amp; GitHub-Based Progress Evaluation ( Moodle like :) )

## Main categories of users for my application:

- Students
- Teacher

---

## Target User Group for my app:

- Teacher

> Reason:
>
> The main reason why the teacher category is my main interest for this application is because is intended to assist the teacher in the homework generation based on the teacher's input + courses posted on the platform, and offer him/her the possibility to overview the activity of the students through the git analysis module. So is more oriented towards the teacher evaluation process rather then helper app for the students.

---

## Main functionalities of my application:

### 1. Generic Functionalities:

- Account creation for both students and teachers.

---

### 2. Students' features:

- **Profile Customisation**
  - It allows the students to connect their github account to the app to enable the automatic extraction of its general stats (repos,stars,bio etc)

- **Enrollment Course/Lab process**
  - The students can be added by the teacher to a specific course/lab, or they can see the available courses for their year + semester, and request from the teacher to join. ( `Teacher approval feature` )

- **Access Course/Lab Materials**
  - The students can download the materials from the platform.

- **Join Project Blueprints**
  - The students can join posted project blueprints (homeworks), posted by the teacher on the platform and submit their github repo where they will work whenever they are ready to be tracked on it.

- **Personal Dashboard**
  - In the profile section, each student can track their own performance for the tracked projects with what the teachers see + it can see the note allocated right there (Feature improvement: comments posting)

- **Vizualisation of other students profiles**
  - This to be decided if implemented, but basically the students can see each others profile.

---

### 3. Teachers' features:

- **Course/Lab Creation**
  - The teacher can create the course, establishing the period it will take, in order to autocalculate the course weeks + their calendaristic value.

- **Students Allocation per course/lab**
  - The teacher can allocate to a course/lab bulk of students depending on the group number/ series letter.

- **Teacher approval feature**
  - The teacher can approve if a student request to join a specific course (students who retake a course/lab)

- **Posting Materials feature**
  - The teacher can post courses' files - favorable pdfs, but to be tested multiple formats.

- **Project Blueprint Generation**
  - The teacher can open a tab for creating project blueprints for students based on prompt
  - ex: the teacher write "I would like to create some projects about this course, where the main domain should be fiscality and real estate", to be added to master prompt behind the scene

- **Editing the project blueprints**
  - Before posting the teacher can delete/edit/save the blueprints and decide to make them visibile for the students or hide them.

- **Teacher Dashboard**
  - The main git analysis summary dashboard, where the teacher can see the main flags per student project.
  - The teacher can filter based on students group of interest (series/specific group), he can see detailed analysis per repo, and he can even request commit level analysis for the commits, which are larger.
  - The teacher also has a expandable section where he can read about each flag calculation and its Methodology ( or as separate page - to be tested).
  - The teacher can also give notes per students project.

---

## Main technical components:

1. `Front-End` - React + Redux
2. `Back-End` - Node.js + Express.js
3. `Git Analysis module` - Python FastApi + Github API
4. `RAG System module` - Python FastApi + embedding model (to be chosen) + Chroma db
5. `Database` - Postgres ( to be tested ).
