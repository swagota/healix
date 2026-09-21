const router = require("express").Router();
const controller = require("../controllers/medicalRecordController");

router.get("/medical-records", controller.get_medical_records);
router.get("/medical-records/:id", controller.get_medical_records_By_id);
router.post("/medical-records", controller.post_medical_records);
router.put("/medical-records/:id", controller.put_medical_records_By_id);
router.delete("/medical-records/:id", controller.delete_medical_records_By_id);

module.exports = router;
