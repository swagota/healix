const router = require("express").Router();
const controller = require("../controllers/patientController");

router.get("/patients", controller.get_patients);
router.get("/patients/:id", controller.get_patients_By_id);
router.post("/patients", controller.post_patients);
router.put("/patients/:id", controller.put_patients_By_id);
router.delete("/patients/:id", controller.delete_patients_By_id);
router.get("/patients/:id/appointments", controller.get_patients_By_id_appointments);
router.get("/patients/:id/medical-records", controller.get_patients_By_id_medical_records);
router.get("/patients/:id/prescriptions", controller.get_patients_By_id_prescriptions);
router.get("/patients/:id/prescriptions/details", controller.get_patients_By_id_prescriptions_details);
router.get("/patients/:id/bills", controller.get_patients_By_id_bills);
router.get("/patients/:id/surgeries", controller.get_patients_By_id_surgeries);

module.exports = router;
