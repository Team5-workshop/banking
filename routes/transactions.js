const express = require("express");
const router = express.Router();
const setup = require("../db_setup");
const sha = require("sha256");
const { ObjectId } = require("mongodb");

// 로그인 상태 확인 미들웨어
function check(req, res, next) {
  if (!req.session.user) {
    res.render("login", {
      data: { alertMsg: "먼저 로그인을 해주세요" },
      user: null,
    });
    return;
  }
  next();
}

// Fetch the account salt from MySQL
async function getAccountSalt(mysqldb, accountId) {
  return new Promise((resolve, reject) => {
    const sql = "SELECT account_salt FROM AccountSalt WHERE account_id = ?";
    mysqldb.query(sql, [accountId], (err, results) => {
      if (err) {
        reject(err);
      } else if (results.length === 0) {
        reject(new Error("Account salt not found"));
      } else {
        resolve(results[0].account_salt);
      }
    });
  });
}

// 입금 라우터
router.post("/transactions/deposit", check, async (req, res) => {
  const { mongodb, mysqldb } = await setup();
  const user_id = req.session.user.user_id;
  const { accountNumber, amount, accountPassword } = req.body;

  try {
    // 계좌 확인
    const account = await mongodb.collection("account").findOne({
      account_number: accountNumber,
      user_id: new ObjectId(user_id),
    });

    if (!account) {
      const accounts = await mongodb
        .collection("account")
        .find({ user_id: new ObjectId(user_id) })
        .toArray();
      return res.render("transactions", {
        alertMsg: "계좌 번호 또는 비밀번호가 틀렸습니다.",
        accounts,
      });
    }

    // Fetch the salt for the account from MySQL
    const accountSalt = await getAccountSalt(mysqldb, account._id.toString());

    // Combine the salt with the provided password and hash the result
    const saltedPassword = sha(accountPassword + accountSalt);

    if (saltedPassword !== account.account_pw) {
      const accounts = await mongodb
        .collection("account")
        .find({ user_id: new ObjectId(user_id) })
        .toArray();
      return res.render("transactions", {
        alertMsg: "계좌 번호 또는 비밀번호가 틀렸습니다.",
        accounts,
      });
    }

    // 입금 트랜잭션 생성
    const transaction = {
      transaction_type: "입금",
      from_account: accountNumber, // 사용자의 계좌 번호
      to_account: accountNumber, // 입금할 계좌 번호
      amount: parseInt(amount),
      user_id: new ObjectId(user_id),
      transaction_date: new Date(),
    };

    // 트랜잭션 저장
    await mongodb.collection("transaction").insertOne(transaction);

    // 계좌 잔액 업데이트
    await mongodb
      .collection("account")
      .updateOne(
        { account_number: accountNumber },
        { $inc: { balance: parseInt(amount) } }
      );

    console.log("Deposit transaction saved to MongoDB:", transaction);
    res.redirect("/transactions/history");
  } catch (error) {
    console.error("Error occurred in /deposit route:", error);
    res.status(500).send("Internal Server Error");
  }
});

// 출금 라우터
router.post("/transactions/withdraw", check, async (req, res) => {
  const { mongodb, mysqldb } = await setup();
  const user_id = req.session.user.user_id;
  const { accountNumber, amount, accountPassword } = req.body;

  try {
    // 계좌 확인
    const account = await mongodb.collection("account").findOne({
      account_number: accountNumber,
      user_id: new ObjectId(user_id),
    });

    // Fetch the salt for the account from MySQL
    const accountSalt = await getAccountSalt(mysqldb, account._id.toString());

    // Combine the salt with the provided password and hash the result
    const saltedPassword = sha(accountPassword + accountSalt);

    if (saltedPassword !== account.account_pw) {
      const accounts = await mongodb
        .collection("account")
        .find({ user_id: new ObjectId(user_id) })
        .toArray();
      return res.render("transactions", {
        alertMsg: "계좌 번호 또는 비밀번호가 틀렸습니다.",
        accounts,
      });
    }

    if (account.balance < parseInt(amount)) {
      const accounts = await mongodb
        .collection("account")
        .find({ user_id: new ObjectId(user_id) })
        .toArray();
      return res.render("transactions", {
        alertMsg: "잔액이 부족합니다.",
        accounts,
      });
    }

    // 출금 트랜잭션 생성
    const transaction = {
      transaction_type: "출금",
      from_account: accountNumber, // 출금할 계좌 번호
      to_account: accountNumber, // 출금이므로 수신자 계좌는 null
      amount: parseInt(amount),
      user_id: new ObjectId(user_id),
      transaction_date: new Date(),
    };

    // 트랜잭션 저장
    await mongodb.collection("transaction").insertOne(transaction);

    // 계좌 잔액 업데이트
    await mongodb
      .collection("account")
      .updateOne(
        { account_number: accountNumber },
        { $inc: { balance: -parseInt(amount) } }
      );

    console.log("Withdrawal transaction saved to MongoDB:", transaction);
    res.redirect("/transactions/history");
  } catch (error) {
    console.error("Error occurred in /withdraw route:", error);
    res.status(500).send("Internal Server Error");
  }
});

// 송금 라우터
router.post("/transactions/transfer", check, async (req, res) => {
  const { mongodb, mysqldb } = await setup();
  const user_id = req.session.user.user_id;
  const {
    accountNumber,
    recipientAccountPart1,
    recipientAccountPart2,
    recipientAccountPart3,
    amount,
    accountPassword,
  } = req.body;

  // Format recipient account number
  const recipientAccountNumber = `${recipientAccountPart1}-${recipientAccountPart2}-${recipientAccountPart3}`;

  try {
    // 계좌 확인
    const account = await mongodb.collection("account").findOne({
      account_number: accountNumber,
      user_id: new ObjectId(user_id),
    });

    // Fetch the salt for the account from MySQL
    const accountSalt = await getAccountSalt(mysqldb, account._id.toString());

    // Combine the salt with the provided password and hash the result
    const saltedPassword = sha(accountPassword + accountSalt);

    if (saltedPassword !== account.account_pw) {
      const accounts = await mongodb
        .collection("account")
        .find({ user_id: new ObjectId(user_id) })
        .toArray();
      return res.render("transactions", {
        alertMsg: "계좌 번호 또는 비밀번호가 틀렸습니다.",
        accounts,
      });
    }

    if (account.balance < parseInt(amount)) {
      const accounts = await mongodb
        .collection("account")
        .find({ user_id: new ObjectId(user_id) })
        .toArray();
      return res.render("transactions", {
        alertMsg: "잔액이 부족합니다.",
        accounts,
      });
    }

    const recipientAccount = await mongodb
      .collection("account")
      .findOne({ account_number: recipientAccountNumber });
    if (!recipientAccount) {
      const accounts = await mongodb
        .collection("account")
        .find({ user_id: new ObjectId(user_id) })
        .toArray();
      return res.render("transactions", {
        alertMsg: "수신자 계좌 번호가 올바르지 않습니다.",
        accounts,
      });
    }

    // 송금 트랜잭션 생성
    const transaction = {
      transaction_type: "이체",
      from_account: accountNumber, // 송금할 계좌 번호
      to_account: recipientAccountNumber, // 수신자 계좌 번호
      amount: parseInt(amount),
      user_id: new ObjectId(user_id),
      transaction_date: new Date(),
    };

    // 트랜잭션 저장
    await mongodb.collection("transaction").insertOne(transaction);

    // 송신자 계좌 잔액 업데이트
    await mongodb
      .collection("account")
      .updateOne(
        { account_number: accountNumber },
        { $inc: { balance: -parseInt(amount) } }
      );

    // 수신자 계좌 잔액 업데이트
    await mongodb
      .collection("account")
      .updateOne(
        { account_number: recipientAccountNumber },
        { $inc: { balance: parseInt(amount) } }
      );

    console.log("Transfer transaction saved to MongoDB:", transaction);
    res.redirect("/transactions/history");
  } catch (error) {
    console.error("Error occurred in /transfer route:", error);
    res.status(500).send("Internal Server Error");
  }
});

// 거래 페이지
router.get("/transactions", check, async (req, res) => {
  const user_id = req.session.user.user_id;
  const { mongodb } = await setup();

  if (!ObjectId.isValid(user_id)) {
    return res.status(400).send("Invalid user ID");
  }

  try {
    const accounts = await mongodb
      .collection("account")
      .find({ user_id: new ObjectId(user_id) })
      .toArray();
    res.render("transactions", { accounts });
  } catch (err) {
    console.error("계좌 조회 실패:", err);
    res.status(500).json({ error: err.message });
  }
});

// 거래 내역 조회 라우터
router.get("/transactions/history", check, async (req, res) => {
  const user_id = req.session.user.user_id;
  const { mongodb } = await setup();

  console.log(`${user_id}가 거래내역을 확인하려 했습니다.`);

  if (!ObjectId.isValid(user_id)) {
    return res.status(400).send("Invalid user ID");
  }

  try {
    const transactions = await mongodb
      .collection("transaction")
      .find({ user_id: new ObjectId(user_id) })
      .toArray();
    console.log(transactions);
    res.render("history", { data: transactions });
  } catch (err) {
    console.error("거래내역 조회 실패:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
