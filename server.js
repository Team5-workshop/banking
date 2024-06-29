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


// app.post("/submit", async function (req, res) {
//   try {
//     const { mongodb } = await setup(); // setup()으로 connectDB 함수 호출
//     const collection = mongodb.collection('Transaction');

//     const transaction = {
//       transaction_type: req.body.transactionType,
//       from_account: req.body.accountNumber,
//       to_account: req.body.recipientAccountNumber,
//       amount: req.body.amount,
//       transaction_date: req.body.transferTime,
//     };

//     await collection.insertOne(transaction);
//     console.log('Transaction saved to MongoDB:', transaction);

//     res.redirect('/list'); // 성공 시 /list 페이지로 리디렉션
//   } catch (error) {
//     console.error('Error occurred in /submit route:', error);
//     res.status(500).send('Internal Server Error');
//   }
// });
app.post("/submit", async function (req, res) {
  try {
    const { mongodb } = await setup(); // setup()으로 connectDB 함수 호출
    const transactionCollection = mongodb.collection('Transaction');
    const accountCollection = mongodb.collection('account');
    const userCollection = mongodb.collection('user');

    const transaction_type = req.body.transactionType;
    const from_account = req.body.accountNumber;
    const to_account = req.body.recipientAccountNumber;
    const amount = parseFloat(req.body.amount);
    const transaction_date = req.body.transferTime;
    const accountPw = parseInt(req.body.accountPw);;

    // 거래하는 유저의 계좌 확인
    const senderAccount = await accountCollection.findOne({ account_number: from_account });
    console.log(senderAccount.account_pw);
    console.log(req.body.accountPw);
    if (!senderAccount) {
      return res.status(404).send('Sender account not found');
    }

    // 비밀번호 확인 로직
    const maxAttempts = 5;
    const lockoutTime = 15 * 60 * 1000; // 15분

    if (senderAccount.lockUntil && senderAccount.lockUntil > Date.now()) {
      return res.status(403).send('Account is temporarily locked. Please try again later.');
    }

    if (senderAccount.account_pw !== accountPw) {
      const attempts = senderAccount.attempts ? senderAccount.attempts + 1 : 1;
      const lockUntil = attempts >= maxAttempts ? Date.now() + lockoutTime : null;

      await accountCollection.updateOne(
        { account_number: from_account },
        { $set: { attempts: attempts, lockUntil: lockUntil } }
      );

      return res.status(401).send(`Incorrect password. ${maxAttempts - attempts} attempts left.`);
    }

    // 비밀번호가 올바르면 시도 횟수 초기화
    await accountCollection.updateOne(
      { account_number: from_account },
      { $set: { attempts: 0, lockUntil: null } }
    );
    // 받는 유저의 ID 가져오기
    const recipientAccount = await accountCollection.findOne({ account_number: to_account });
    if (!recipientAccount) {
      return res.status(404).send('Recipient account not found');
    }
    
    if (transaction_type === "출금") {
      // 출금 로직
      if (senderAccount.balance < amount) {
        return res.status(400).send('Insufficient balance');
      }

      await accountCollection.updateOne(
        { account_number: from_account },
        { $inc: { balance: -amount } }
      );

    } else if (transaction_type === "입금") {
      // 입금 로직
      await accountCollection.updateOne(
        { account_number: from_account },
        { $inc: { balance: amount } }
      );

    } else {
      // 송금 로직
      const recipientAccount = await accountCollection.findOne({ account_number: to_account });
      if (!recipientAccount) {
        return res.status(404).send('Recipient account not found');
      }

      if (senderAccount.balance < amount) {
        return res.status(400).send('Insufficient balance');
      }
    // 거래하는 유저의 계좌 정보 업데이트
      await accountCollection.updateOne(
        { account_number:  from_account },
        { $inc: { balance: -amount } }
      );
      // 받는 유저의 계좌 정보 업데이트
      await accountCollection.updateOne(
        { account_number: to_account },
        { $inc: { balance: amount } }
      );
    }
    // Transaction 데이터 삽입
    const transaction = {
      transaction_type,
      from_account,
      to_account,
      amount,
      transaction_date
    };
    await transactionCollection.insertOne(transaction);

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
