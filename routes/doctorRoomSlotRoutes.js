const express = require('express');
const router = express.Router();
const doctorRoomSlotController = require('../controllers/doctorRoomSlotController');

router.get('/doctor-room-slots', doctorRoomSlotController.getAllDoctorRoomSlots);
router.post('/doctor-room-slots', doctorRoomSlotController.createDoctorRoomSlot);

module.exports = router;
