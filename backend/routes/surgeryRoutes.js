const router = require("express").Router();
const controller = require("../controllers/surgeryController");

router.get("/surgeries", controller.get_surgeries);
router.get("/surgeries/:id", controller.get_surgeries_By_id);
router.post("/surgeries", controller.post_surgeries);
router.put("/surgeries/:id", controller.put_surgeries_By_id);
router.delete("/surgeries/:id", controller.delete_surgeries_By_id);

module.exports = router;
