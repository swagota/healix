const router = require('express').Router();
const controller = require('../controllers/authController');
const { authenticate } = require('../middleware_auth');

router.post('/login', controller.post_login);
router.post('/register/patient', controller.post_patient_register);
router.get('/me', authenticate, controller.get_me);
router.post('/logout', authenticate, controller.post_logout);

module.exports = router;
