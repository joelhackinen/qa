import { Router } from "../deps.js";
import { getCourses } from "../services/courseService.js";

const router = new Router();

router.get("/courses", async ({ response }) => {
  const courses = await getCourses();
  response.body = courses;
});

export default router;
