const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');

router.get('/rooms', roomController.getAllRoom);
router.post('/rooms', roomController.createRoom);

module.exports = router;
