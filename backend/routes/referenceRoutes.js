const router = require("express").Router();
const controller = require("../controllers/referenceController");

router.get("/departments", controller.get_departments);
router.get("/specializations", controller.get_specializations);
router.get("/rooms", controller.get_rooms);
router.get("/wards", controller.get_wards);
router.get("/time-slots", controller.get_time_slots);

module.exports = router;
