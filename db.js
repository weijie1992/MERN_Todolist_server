const mongodb = require("mongodb");
const MongoClient = mongodb.MongoClient;

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

let _db;

const initDb = async (Callback) => {
  if (_db) {
    console.log("Database is already initialized!");
    return Callback(null, _db); //return (err,db);
  }
  try {
    _db = await client.connect();
    console.log(_db);
    console.log("Database initialized")
    return Callback(null, _db); //return (err,db);
  } catch (err) {
    console.error("Error initialize DB : ", err);
    Callback(err,null);
  }
};

const getDb = () => {
  if (!_db) {
    throw Error("Database not initialized");
  }
  return _db;
};
module.exports = { initDb, getDb };
