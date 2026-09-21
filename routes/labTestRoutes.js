const router = require("express").Router();
const controller = require("../controllers/labTestController");

router.get("/lab-tests", controller.get_lab_tests);
router.get("/lab-tests/:id", controller.get_lab_tests_By_id);
router.post("/lab-tests", controller.post_lab_tests);
router.put("/lab-tests/:id", controller.put_lab_tests_By_id);
router.delete("/lab-tests/:id", controller.delete_lab_tests_By_id);

module.exports = router;
