const { getDb } = require("../db");
const ObjectId = require("mongodb").ObjectId;


const findUser = async (email) => {
  let user = await getDb()
    .db("todolistdb")
    .collection("users")
    .aggregate([
      { $match: { email } },
      { $project: { password: 0 } },
      {
        $lookup: {
          from: "todos",
          localField: "todos",
          foreignField: "_id",
          as: "todos",
        },
      },
    ]);
  user = await user.next();
  //sort todos in accending order
  if (user && user.todos) {
    user.todos = user.todos.sort((a, b) =>
      a.dueDateTime.localeCompare(b.dueDateTime)
    );
  }
  return user;
};

exports.getTaskByUserIDController = async (req, res) => {
  console.log("In getTaskByUserIDController");
  const { email } = req.params;
  if (!email) {
    return res.status(400).json({ error: "Email not sent" });
  }
  console.log("!!!!!!!!!!!!!1req.params")
  console.log(req.params)
  const user = await findUser(email);
  console.log("2222222222222req.params")
  console.log(user)
  return res.json(user);
};

exports.updateTaskController = async (req, res) => {
  console.log("In updateTaskController");
  const { email } = req.params;
  const { taskID, isCompleted } = req.body;
  console.log(email, taskID, isCompleted);
  if (!email || !taskID || isCompleted === "undefined") {
    return res
      .status(400)
      .json({ error: "email or TaskID or IsCompleted is not Provided" });
  }
  const user = findUser(email);
  if (user) {
    let updatedRes = await getDb()
      .db("todolistdb")
      .collection("todos")
      .updateOne({ _id: ObjectId(taskID) }, { $set: { isCompleted } });
    console.log(updatedRes);
    if (updatedRes.modifiedCount === 1) {
      const updatedUser = await findUser(email);
      return res.json(updatedUser);
    }
    return res.status(500).json({
      error: "Record cant be updated",
    });
  }
  return res.status(500).json({
    error: "User cant be found",
  });
};

exports.deletedTaskController = async (req, res) => {
  console.log("In deletedTaskController");
  const { email } = req.params;
  const { taskID } = req.body;
  console.log(email, taskID);
  //validation
  if (!email || !taskID) {
    return res.status(400).json({ error: "email or TaskID is not Provided" });
  }

  const user = await findUser(email);
  if (user) {
    console.log(user);
    //ACID transaction
    //1) Create a session
    const session = getDb().startSession();
    //2) Define option for the transaction need to know more
    const transactionOptions = {
      readPreference: "primary",
      readConcern: { level: "majority" },
      writeConcern: { w: "majority" },
    };
    //3)start transaction
    try {
      const deleteResults = await session.withTransaction(async () => {
        const updateUserTodosArray = await getDb()
          .db("todolistdb")
          .collection("users")
          .updateOne(
            { email },
            { $pull: { todos: { $in: [ObjectId(taskID)] } } },
            {
              session,
            }
          );
        //if update fail, terminate transaction
        console.log(updateUserTodosArray);
        if (!updateUserTodosArray || updateUserTodosArray.modifiedCount !== 1) {
          await session.abourTransaction();
          console.error(
            "Transaction was cancelled due to an unexpected error, update user todo fail"
          );
          return;
        }
        //Delete from todo
        const deleteTodos = await getDb()
          .db("todolistdb")
          .collection("todos")
          .deleteOne({ _id: ObjectId(taskID) });
        console.log(deleteTodos);
        if (!deleteTodos || deleteTodos.deletedCount !== 1) {
          await session.abourTransaction();
          console.error(
            "Transaction was cancelled due to an unexpected error, delete from todos collection fail"
          );
          return;
        }
      }, transactionOptions);
      if (deleteResults) {
        console.log("Update user and delete todos was successful");
        const deletedUserToods = await findUser(email);
        console.log(deletedUserToods);
        return res.json(deletedUserToods);
      } else {
        return res.status(500).json({
          error: "Transaction was cancelled due to an unexpected error ",
        });
      }
    } catch (err) {
      console.error(
        "Transaction was cancelled due to an unexpected error ",
        err
      );
      return res.status(500).json({
        error: "Transaction was cancelled due to an unexpected error ",
        err,
      });
    } finally {
      await session.endSession();
    }
  } //end find user
  else {
    return res.status(400).json({ error: "User does not exist" });
  }
};

exports.addTaskController = async (req, res) => {
  const { email, task, dueDateTime } = req.body;
  ///validation
  if (!email || !task || !dueDateTime) {
    return res
      .status(400)
      .json({ error: "email or TaskID or dueDateTime is not Provided" });
  }
  //ACID transaction
  //1) Create a session
  const session = getDb().startSession();
  //2） define option for the transaction need to know more
  const transactionOptions = {
    readPreference: "primary",
    readConcern: { level: "majority" },
    writeConcern: { w: "majority" },
  };
  //check if user exist in DB
  const user = await getDb()
    .db("todolistdb")
    .collection("users")
    .findOne({ email });
  //if user exist, insert
  //Start session
  if (user) {
    try {
      const insertResults = await session.withTransaction(async () => {
        const insertTodoRes = await getDb()
          .db("todolistdb")
          .collection("todos")
          .insertOne(
            {
              task,
              dueDateTime,
              isCompleted: false,
              isDeleted: false,
            },
            { session }
          );
        //insert fail abort Transaction
        if (!insertTodoRes) {
          //abort transaction
          await session.abortTransaction();
          console.error(
            "Transaction was cancelled due to an unexpected error, insert todo failed"
          );
          return;
        }
        //Insert success update to user db
        const insertedTaskID = insertTodoRes.insertedId;
        //update user db add todos
        const updateUser = await getDb()
          .db("todolistdb")
          .collection("users")
          .updateOne(
            { email },
            { $push: { todos: insertedTaskID } },
            { session }
          );
        //abort transaction if update user fail
        if (!updateUser || updateUser.modifiedCount !== 1) {
          await session.abortTransaction();
          console.error(
            "Transaction was cancelled due to an unexpected error, update todo to user failed"
          );
          return;
        }
        return;
      }, transactionOptions);

      if (insertResults) {
        //insert successful
        console.log("insert Results Success");
        const results = await findUser(email);
        return res.json(results);
      } else {
        console.log("insert Results fail");
        return res.status(500).json({
          error: "Transaction was cancelled due to an unexpected error ",
        });
      }
    } catch (err) {
      console.error(
        "Transaction was cancelled due to an unexpected error ",
        err
      );
      return res.status(500).json({
        error: "Transaction was cancelled due to an unexpected error ",
        err,
      });
    } finally {
      await session.endSession();
    }
  } else {
    //user not exist
    return res.status(400).json({ error: "User does not exist" });
  }
};
