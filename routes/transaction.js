const express = require('express');
const router = express.Router();
const ObjId = require("mongodb").ObjectId;

// 로그인 상태 확인 미들웨어
function check(req, res, next) {
  if (!req.session.user) {
    return res.status(500).send();
  }
  next();
}

// 입금 (Deposit)
router.post("/deposit", check, (req, res) => {
  const { account_number, amount } = req.body;
  const depositAmount = parseInt(amount);

    mydb
        .collection("account")
        .updateOne(
         { account_number },
         { $inc: { balance: depositAmount } }
  )
        .then(result => {
        if (result.modifiedCount === 0) {
        return res.status(500).send();
     }
    return mydb.collection("account").findOne({ account_number });
  })
        .then(account => {
            const transaction = {
            user_id: req.session.user.user_id,
            account_id: account.account_pk,
            type: "deposit",
            amount: depositAmount,
            date: new Date()
    };
    return mydb.collection("transaction").insertOne(transaction);
  })
        .then(result => {
            console.log("입금성공:", result);
            res.redirect("/account");
  })
        .catch(err => {
            console.error("입금실패:", err);
            res.status(500).send("");
  });
});

// 출금 (Withdraw)
router.post("/withdraw", check, (req, res) => {
  const { account_number, amount } = req.body;
  const withdrawAmount = parseInt(amount);

        mydb
        .collection("account")
        .updateOne(
            { account_number, balance: { $gte: withdrawAmount } }, // 출금할 금액이 잔액보다 클 수 없음
            { $inc: { balance: -withdrawAmount } }
            )
        .then(result => {
            if (result.modifiedCount === 0) {
            return res.status(400).send();
             }
            return mydb.collection("account").findOne({ account_number });
  })
        .then(account => {
            const transaction = {
            user_id: req.session.user.user_id,
            account_id: account.account_pk,
            type: "withdraw",
            amount: withdrawAmount,
            date: new Date()
    };
            return mydb.collection("transaction").insertOne(transaction);
  })
        .then(result => {
                console.log("출금완료:", result);
                res.redirect("/account");
  })
        .catch(err => {
            console.error("", err);
            res.status(500).send("");
  });
});

// 송금 (Transfer) 아직 구현중
