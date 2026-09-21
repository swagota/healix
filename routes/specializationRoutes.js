const express = require('express');
const router = express.Router();
const specializationController = require('../controllers/specializationController');

router.get('/specializations', specializationController.getAllData);
router.post('/specializations', specializationController.createData);

module.exports = router;
