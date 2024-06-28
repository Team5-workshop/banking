// 모듈 불러오기
const setup = require("./db_setup"); // DB 연결
const dotenv = require("dotenv").config();
const express = require("express"); // 서버 호출
const app = express();
const bodyParser = require("body-parser");
const session = require("express-session");
const cookieParser = require("cookie-parser");
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
app.get("/trsns",(req,res)=>{
  res.sendFile(__dirname + "/enter.html");
})



app.post('/submit', async (req, res) => {
  const db = await connectDB();
  const newTransaction = {
    transaction_type: req.body.transactionType,
    from_account: req.body.accountNumber,
    to_account: req.body.recipientAccountNumber,
    amount: parseFloat(req.body.amount),
    transaction_date: req.body.transferTime,
  };

  try {
    await db.collection('transactions').insertOne(newTransaction);
    res.send('Transaction saved successfully.');
  } catch (err) {
    console.error('Error saving transaction:', err);
    res.send('Error saving transaction.');
  }
});

// 서버 오픈
app.listen(8080, async () => {
  await setup();
  console.log("server is ready");
});
