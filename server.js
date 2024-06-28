// 모듈 불러오기
const setup = require("./db_setup"); // DB 연결
const dotenv = require("dotenv").config();
const express = require("express"); // 서버 호출
const app = express();
const bodyParser = require("body-parser");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const path = require("path");
// app 등록 과정
app.use(
  session({
    secret: process.env.SESSION_SECRET_KEY,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(cookieParser());

app.use(bodyParser.urlencoded({ extended: true }));

// 정적 파일 제공 설정
app.use(express.static(path.join(__dirname, "assets")));

// 뷰 엔진 설정
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use("/", require("./routes/account")); // 계좌
app.use("/", require("./routes/user")); // 고객

// 메인 페이지 라우트
app.get("/", (req, res) => {
  res.render("index", { user: req.session.user });
});

// 서버 오픈
app.listen(process.env.WEB_PORT, async () => {
  await setup();
  console.log("server is ready");
});
