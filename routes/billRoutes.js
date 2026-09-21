const router = require("express").Router();
const controller = require("../controllers/billController");

router.get("/bills", controller.get_bills);
router.get("/bills/:id", controller.get_bills_By_id);
router.post("/bills/:id/pay", controller.sandbox_pay_bill);
router.post("/bills", controller.post_bills);
router.put("/bills/:id", controller.put_bills_By_id);
router.delete("/bills/:id", controller.delete_bills_By_id);

module.exports = router;
