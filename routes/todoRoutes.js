const express = require("express");
const router = express.Router();
const { jwtCheck } = require("../middleware/jwtCheck");

const {getTaskByUserIDController,updateTaskController,deletedTaskController,addTaskController} = require("../controller/todoController");

router.get("/getTaskByUserID/:email",jwtCheck,getTaskByUserIDController )

router.put("/updateTask/:email",jwtCheck,updateTaskController )

router.delete("/deleteTask/:email",jwtCheck,deletedTaskController )

router.post("/addTask",jwtCheck,addTaskController )

module.exports = router;