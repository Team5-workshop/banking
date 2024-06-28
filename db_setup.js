const dotenv = require("dotenv").config();
const { MongoClient } = require("mongodb");
const mysql = require("mysql2");

let mongodb;
let mysqldb;

// local 정보



const myHost = {
  host: 'localhost',
  user: 'root',
  password: '0000',
  database: 'myboard',
};

const setup = async () => {
  if (mongodb && mysqldb) {
    return { mongodb, mysqldb };
  }

  try {
    // 몽고DB 접속
    const mongoDbUrl = `mongodb+srv://admin:1234@cluster0.etmvsze.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
    const mongoConn = await MongoClient.connect(mongoDbUrl);
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
