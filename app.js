const { ObjectId } = require("bson");
const express = require("express");
const morgan = require("morgan");
require("dotenv").config();
const cors = require("cors");
const bodyParser = require("body-parser");

const { initDb, getDb } = require("./db");
const todoRouter = require("./routes/todoRoutes");
const userRoutes = require("./routes/userRoutes");
const { MongoCursorInUseError } = require("mongodb");

//init db and start express
initDb(async (err, db) => {
  if (err) {
    console.log(err);
  } else {
    //start express
    const app = express();
    //track http request
    app.use(morgan("dev"));
    //test api
    const testAPI = (req, res) => {
      res.send("hello world");
    };
    app.get("/", testAPI);
    //use cors
    app.use(cors());
    //use body parser for json
    app.use(bodyParser.json());
    //handle routes
    app.use("/api", todoRouter);
    app.use("/api", userRoutes);
    //handle errors

    app.listen(8000);
    console.log("Express Server started on port : 4001");
  } //end else
});

/*
    console.log("***********find***********");
    const find = await getDb()
      .db()
      .collection("users")
      .find()
      .toArray();
    console.log(find);
    
  
    console.log("***********insert***********");
    const insert = await getDb()
      .db()
      .collection("testcollection")
      .insertOne({ name2: "hahaha4", price : 3});
    console.log(insert);
    
    console.log("***********findone***********");
    const findone = await getDb().db().collection("testcollection").findOne({});
    console.log(findone);

    console.log("***********updateone***********");
    const updateone = await getDb()
      .db()
      .collection("testcollection")
      .updateOne(
        { _id: new ObjectId("617982e59caafbbde36a719b") },
        { $set: { name: "weijie" } }
      );
    console.log(updateone);

    console.log("***********deleteOne***********");
    const deleteOne = await getDb()
      .db()
      .collection("testcollection")
      .deleteOne(
        { _id: new ObjectId("617982e59caafbbde36a719b") },
        { $set: { name: "weijie" } }
      );
    console.log(deleteOne);
      
    console.log("***********findwithSortSkipLimit***********");
    const findwithSortSkipLimit = await getDb()
      .db()
      .collection("testcollection")
      .find({})
      .sort({ price: 1 })
      .skip(1)
      .limit(1)
      .toArray();

    console.log(findwithSortSkipLimit);
    
    console.log("***********deleteMany***********");
    const deleteMany = await getDb()
      .db()
      .collection("testcollection")
      .deleteMany();
    console.log(deleteMany);
    */

// client
//   .db()
//   .collection("testcollection")
//   .find({})
//   .forEach((item) => {
//     console.log(item._id);
//   })
//   .then((result) => {
//     console.log("Finally success ", result);
//   });
