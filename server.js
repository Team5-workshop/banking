// 모듈 불러오기
const setup = require("./db_setup"); // DB 연결
const dotenv = require("dotenv").config();
const express = require("express"); // 서버 호출
const app = express();
const bodyParser = require("body-parser");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const path = require("path");
// app.get('/', (req, res) => {
//   res.render('index');
// });
app.use(express.static('public'));
app.set('view engine', 'ejs');
// app 등록 과정
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/", require("./routes/account")); // 계좌
app.use("/", require("./routes/user")); // 고객

app.use(
  session({
    secret: '암화키',
    resave: false,
    saveUninitialized: false,
  })
);

app.use(cookieParser());

//mongodb에서 거래내역 뽑아 오기
app.get("/list", async function (req, res) {
  try {
    const { mongodb } = await setup(); // setup()으로 connectDB 함수 호출
    const collection = mongodb.collection('Transaction');
    const result = await collection.find().toArray();
    res.render('list', { data: result });
    
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});
app.get("/trsns", (req, res) => {
  res.render('trsns'); // EJS 파일을 렌더링
});


app.post("/submit", async function (req, res) {
  try {
    const { mongodb } = await setup(); // setup()으로 connectDB 함수 호출
    const collection = mongodb.collection('Transaction');

    const transaction = {
      transaction_type: req.body.transactionType,
      from_account: req.body.accountNumber,
      to_account: req.body.recipientAccountNumber,
      amount: req.body.amount,
      transaction_date: req.body.transferTime,
    };

    await collection.insertOne(transaction);
    console.log('Transaction saved to MongoDB:', transaction);

    res.redirect('/list'); // 성공 시 /list 페이지로 리디렉션
  } catch (error) {
    console.error('Error occurred in /submit route:', error);
    res.status(500).send('Internal Server Error');
  }
});

// 서버 오픈
app.listen(8080, async () => {
  await setup();
  console.log("server is ready");
});
