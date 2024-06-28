const dotenv = require("dotenv").config();
const { MongoClient } = require("mongodb");
const mysql = require("mysql");

let mongodb;
let mysqldb;

// local 정보

const myHost = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PW,
  database: process.env.MYSQL_DB,
};

const setup = async () => {
  if (mongodb && mysqldb) {
    return { mongodb, mysqldb };
  }

  try {
    // 몽고DB 접속
    const mongoDbUrl = process.env.MONGODB_URL;
    const mongoConn = await MongoClient.connect(mongoDbUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    mongodb = mongoConn.db("bank");
    console.log("몽고DB 접속 성공");

    // MySQL 접속
    mysqldb = mysql.createConnection(myHost);
    mysqldb.connect();
    console.log("MySQL 접속 성공");

    return { mongodb, mysqldb };
  } catch (err) {
    console.error("DB 접속 실패", err);
    throw err;
  }
};

module.exports = setup;
