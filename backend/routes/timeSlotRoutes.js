const express = require('express');
const router = express.Router();
const timeSlotController = require('../controllers/timeSlotController');

router.get('/time-slots', timeSlotController.getAllTimeSlots);
router.post('/time-slots', timeSlotController.createTimeSlot);

module.exports = router;
