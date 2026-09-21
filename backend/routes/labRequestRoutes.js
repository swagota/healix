const router = require('express').Router();
const controller = require('../controllers/labRequestController');

router.get('/lab-requests', controller.get_lab_requests);
router.get('/lab-requests/:id', controller.get_lab_requests_By_id);
router.post('/lab-requests', controller.post_lab_requests);
router.put('/lab-requests/:id', controller.put_lab_requests_By_id);
router.delete('/lab-requests/:id', controller.delete_lab_requests_By_id);
router.get('/patients/:id/lab-requests', controller.get_patient_lab_requests);
router.post('/patients/:id/lab-requests', controller.create_patient_lab_request);

module.exports = router;
