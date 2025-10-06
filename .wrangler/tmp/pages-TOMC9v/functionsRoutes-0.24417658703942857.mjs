import { onRequestGet as __api_courses_js_onRequestGet } from "/Users/brad/git/yacs/functions/api/courses.js"

export const routes = [
    {
      routePath: "/api/courses",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_courses_js_onRequestGet],
    },
  ]