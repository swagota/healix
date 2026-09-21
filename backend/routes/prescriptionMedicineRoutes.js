const express = require('express');
const router = express.Router();
const controller = require('../controllers/prescriptionMedicineController');

router.get('/prescription-medicines', controller.getAllPrescriptionMedicines);
router.post('/prescription-medicines', controller.createPrescriptionMedicine);

module.exports = router;
