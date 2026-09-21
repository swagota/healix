const router = require("express").Router();
const controller = require("../controllers/appointmentController");

router.get("/appointments", controller.get_appointments);
router.get("/appointments/:id", controller.get_appointments_By_id);
router.post("/appointments", controller.post_appointments);
router.put("/appointments/:id", controller.put_appointments_By_id);
router.post("/appointments/:id/complete", controller.complete_appointment);
router.delete("/appointments/:id", controller.delete_appointments_By_id);

module.exports = router;
