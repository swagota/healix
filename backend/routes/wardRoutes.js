const express = require('express');
const router = express.Router();
const wardController = require('../controllers/wardController');

router.get('/wards', wardController.getAllWards);
router.post('/wards', wardController.createWard);

module.exports = router;
