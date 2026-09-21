const router = require("express").Router();
const controller = require("../controllers/systemController");

router.get("/", controller.get_root);
router.get("/test-db", controller.get_test_db);

module.exports = router;
