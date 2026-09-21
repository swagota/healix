const express = require('express');
const router = express.Router();
const medicineController = require('../controllers/medicineController');

router.get('/medicines', medicineController.getAllMedicines);
router.post('/medicines', medicineController.createMedicine);

module.exports = router;
