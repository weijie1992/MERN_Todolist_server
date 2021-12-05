const express = require("express");
const router = express.Router();

const {
  registerWithUsernamePasswordController,
  activateAccountController,
  createUserAccountController,
  loginViaPasswordController,
  forgetPasswordController,
  resetPasswordJWTCheckController,
  resetPasswordController,
} = require("../controller/userController");

router.post("/Register", registerWithUsernamePasswordController);

router.get("/activateAccount/:jwtToken", activateAccountController);
router.post("/createUserAccount", createUserAccountController);
router.post("/loginViaPassword", loginViaPasswordController);
router.get("/forgetPassword/:email", forgetPasswordController);
router.get("/resetPasswordJWTCheck/:jwtToken", resetPasswordJWTCheckController);
router.post("/resetPassword", resetPasswordController);
module.exports = router;
