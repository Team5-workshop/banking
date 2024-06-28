// 모듈 불러오기
const setup = require("./db_setup"); // DB 연결
const dotenv = require("dotenv").config();
const express = require("express"); // 서버 호출
const app = express();
const bodyParser = require("body-parser");
const session = require("express-session");
const cookieParser = require("cookie-parser");

// app 등록 과정
app.use(
  session({
    secret: SECRET_KEY,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(cookieParser());

app.use(bodyParser.urlencoded({ extended: true }));
app.use("/", require("./routes/account")); // 계좌
app.use("/", require("./routes/user")); // 고객

// 서버 오픈
app.listen(process.env.WEB_PORT, async () => {
  await setup();
  console.log("server is ready");
});
