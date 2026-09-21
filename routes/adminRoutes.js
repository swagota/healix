const router = require("express").Router();
const controller = require("../controllers/adminController");

router.get("/admins", controller.get_admins);
router.get("/admins/:id", controller.get_admins_By_id);
router.post("/admins", controller.post_admins);
router.put("/admins/:id", controller.put_admins_By_id);
router.delete("/admins/:id", controller.delete_admins_By_id);

module.exports = router;
