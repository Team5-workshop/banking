// 모듈 불러오기
const setup = require("./db_setup"); // DB 연결
const dotenv = require("dotenv").config();
const express = require("express"); // 서버 호출
const app = express();
const bodyParser = require("body-parser");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const path = require("path");
const MongoStore = require("connect-mongo");
const { ObjectId } = require("mongodb");

// MongoDB URL 설정
const mongoUrl = process.env.MONGODB_URL;

// 세션 저장소 설정
const sessionStore = MongoStore.create({
  mongoUrl: mongoUrl,
  collectionName: "sessions",
});

// app 등록 과정
app.use(
  session({
    secret: process.env.SESSION_SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      secure: false, // HTTPS를 사용하는 경우 true로 설정
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // 1일
    },
  })
);

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));

// 정적 파일 제공 설정
app.use(express.static(path.join(__dirname, "assets")));
app.use("/public", express.static(path.join(__dirname, "public")));
// 뷰 엔진 설정
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// 모든 라우트에서 user 변수를 사용할 수 있도록 설정
app.use((req, res, next) => {
  res.locals.user = req.session.user;
  next();
});

// 라우트 설정
app.use("/", require("./routes/account"));
app.use("/", require("./routes/user"));
app.use("/", require("./routes/transactions"));

// 메인 페이지 라우트
app.get("/", (req, res) => {
  res.render("index");
});

// 서버 오픈
app.listen(process.env.WEB_PORT, async () => {
  await setup();
  console.log("server is ready");
});
