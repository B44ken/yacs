# uoft adapter quick reference

- endpoint → `POST https://api.easi.utoronto.ca/ttb/getPageableCourses`
- minimal payload →
  ```json
  {
    "courseCodeAndTitleProps": {
      "courseCode": "",
      "courseTitle": "CSC258",
      "courseSectionCode": "",
      "searchCourseDescription": true
    },
    "sessions": ["20259", "20261", "20259-20261"],
    "divisions": ["APSC", "ARTSC"],
    "page": 1,
    "pageSize": 20,
    "direction": "asc"
  }
  ```
- fields used by the adapter → `courses[].code`, `courses[].name`, `courses[].sessions`, `courses[].sections`, `sections[].sectionNumber`, `sections[].teachMethod`, `sections[].meetingTimes`
- day mapping → integers `1`–`7` map to Monday–Sunday; convert `millisofday` to seconds for storage.

Everything else in the response is currently ignored.

