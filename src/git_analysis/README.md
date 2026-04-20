# Git Analysis Module:

This readme is intended to serve as the main documentation for this standalone **Git Analysis Module** feature. This readme will cover the API structure of the custom API plus a short list of instructions on how to use the streamlit application to test individually the API.

# API Docs:

The main role of this api is basically to pretty format the returned outputs from the official Github REST API, in order to extract the raw data about the user give + public repos activity

## Technical Limitations:

At this phase I decided to use a PAT (Personal Access Token), in order to be able to have around 5000 request per day, instead of 60 without one. This is the current limitation of this module cause you need to setup a PAT in order to benefit mostly from this custom API "wrap". :)

## Endpoints List:

> Note: Header is mostly the same for all with the Github PAT

1. `/` - health check
2. `/users/{gh_username}` - returns user info
   - Role: for `profile custom feature of students`
3. `/users/{gh_username}/repos` - returns all repos for a specific user
   - Roles:
     - `profile custom feature of students`
4. `/users/{gh_username}/repos/{repo_name}`
   - Roles:
     - validating the given repo link for joining on project blueprint.-TBD
5. `/users/{gh_username}/repos/{repo_name}/commits` - returns all commits data for a specific repo.
   - Role:
     - metrics calculation
     - pe metrics link to get `commit info`
   - Query paramas:
     - Start date = default start of the semester
     - End date = default end of the semester
   - Github API params:
     - since → ISO 8601 format (start date)
     - until → ISO 8601 format (end date)
6. `/users/{gh_username}/repos/{repo_name}/commits/{commit_id}` - return data for a specific commit
   - Role:
     - Individual commits overview.
7. `/users/{gh_username}/repos/{repo_name}/tree`

- returns the current tree structure
- Considerations:
  - it should keep in mind that if i want a tree structure of the last commit until deadline, i should get the tree sha of the last commit and use that as reference to get recursive tree sha. To be tested.

8. `/users/{gh_username}/repos/{repo_name}/metrics/commits-analysis` - it returns a series of metrics
   - Query params:
     - deadline date - yyyy-mm-dd
   - Consideration:
     - we need a set of 3 metrics: - author=commiter=student - author=student - commiter=student
     - > Reason: the first two cases are good cause they might have been done by the student, but if the author is different then the student that is sus, other person activity detected. But I am gonna treat the author=student one as one category and the only outlier is the commiter only is the student.
   - List of metrics for all categories:
     - Total number of commits, including merge ones.
     - Total number of commits non-merge
     - Total number of commits merge-type
     - Procentage of work on branch then merge
     - List of active days
       - Active day = min 1 commit
     - List of total commits number per each day
     - Total number of active days
     - Average number of commits per day
     - One day concentration procentage
       - def = how much % represents to most active day from all commit history volume / if the student grinded one day to finish it all or done with AI in 1 day.
     - Total number of days until deadline
     - Activity spread
       - how much procentage between start and end time of a project deadline ahd the student worked
         -formula: active days/project total days
     - Largest activity gap in days
     - List of gaps between commits
     - Procentage of commits done in last day.
     - first commit date
     - last commit date.
     - TO BE CHECKED: light nlp pipeline

- 8. `/users/{gh_username}/repos/{repo_name}/metrics/structure-analysis`
  - Query params:
    - deadline date - yyyy-mm-dd
  - Params/Body:
    - a folde structure to be checked from the tree
  - Metrics:
    - boolean with check per needed structure

-
