const router = require("express").Router();
const controller = require("../controllers/prescriptionController");

router.get("/prescriptions", controller.get_prescriptions);
router.get("/prescriptions/:id", controller.get_prescriptions_By_id);
router.post("/prescriptions", controller.post_prescriptions);
router.put("/prescriptions/:id", controller.put_prescriptions_By_id);
router.delete("/prescriptions/:id", controller.delete_prescriptions_By_id);
router.get("/prescription-medicines", controller.get_prescription_medicines);
router.get("/prescriptions/:id/medicines", controller.get_prescriptions_By_id_medicines);
router.post("/prescriptions/:id/medicines", controller.post_prescriptions_By_id_medicines);
router.put("/prescriptions/:id/medicines/:medicineId", controller.put_prescriptions_By_id_medicines_By_medicineId);
router.delete("/prescriptions/:id/medicines/:medicineId", controller.delete_prescriptions_By_id_medicines_By_medicineId);

module.exports = router;
