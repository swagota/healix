const router = require("express").Router();
const controller = require("../controllers/doctorController");

router.get("/doctors", controller.get_doctors);
router.get("/doctors/:id", controller.get_doctors_By_id);
router.post("/doctors", controller.post_doctors);
router.put("/doctors/:id", controller.put_doctors_By_id);
router.put("/doctors/:id/consultation-fee", controller.put_doctor_consultation_fee);
router.delete("/doctors/:id", controller.delete_doctors_By_id);
router.get("/doctors/:id/appointments", controller.get_doctors_By_id_appointments);
router.get("/doctors/:id/patients", controller.get_doctors_By_id_patients);
router.get("/doctors/:id/patients/:patientId/medical-records", controller.get_doctors_By_id_patient_history);
router.get("/doctors/:id/surgeries", controller.get_doctors_By_id_surgeries);

module.exports = router;
