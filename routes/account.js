const express = require('express');
const router = express.Router();
const ObjId = require("mongodb").ObjectId;

function generateAccountNumber() {
  const part1 = `33${Math.floor(10 + Math.random() * 90)}`; // 3300-3399 사이의 숫자
  const part2 = Math.floor(10 + Math.random() * 90); // 10-99 사이의 숫자
  const part3 = Math.floor(100000 + Math.random() * 900000); 
  return `${part1}-${part2}-${part3}`;
}

function accountNoMasking(accountNo) {
  // 계좌번호는 숫자와 하이픈으로 구성됨
  const regex = /^[0-9-]+$/;
  if (regex.test(accountNo)) {
    const length = accountNo.length;
    if (length >= 5) {
      return accountNo.slice(0, -5) + '*****';
    }
  }
  return accountNo;
}

router.get("/", (req, res) => {
  const user_id = req.query.user_id || "test_user";  // 디버깅을 위해 임의의 user_id 사용
  req.app.locals.db.collection("account").find({ user_id }).toArray()
    .then(accounts => {
      // 각 계좌번호를 마스킹
      accounts.forEach(account => {
        account.account_number = accountNoMasking(account.account_number);
      });
      res.render("account", { accounts });
    })
    .catch(err => {
      console.error("Failed to retrieve accounts:", err);
      res.status(500).send("Failed to retrieve accounts");
    });
});

router.get("/enter", (req, res) => {
  res.render("enter.ejs", { user_id: "test_user" }); // 디버깅을 위해 임의의 user_id 사용
});

router.post("/enter", (req, res) => {
  const user_id = req.body.user_id || "test_user";  // 디버깅을 위해 임의의 user_id 사용
  const { account_pw, balance } = req.body;
  const newAccount = {
    account_number: generateAccountNumber(), // 생성된 계좌번호 사용
    account_pw,
    balance: parseInt(balance),
    user_id,
    account_pk: new ObjId(),
    account_date: new Date()
  };
  
  // account 컬렉션에 새 계좌 삽입
  req.app.locals.db.collection("account").insertOne(newAccount)
    .then(result => {
      console.log("Account inserted:", result);
      // user 컬렉션에 계좌 정보 업데이트
      return req.app.locals.db.collection("user").updateOne(
        { user_id },
        { $push: { account_pk: newAccount.account_pk } }
      );
    })
    .then(result => {
      console.log("User updated:", result);
      res.redirect("/account?user_id=" + user_id);
    })
    .catch(err => {
      console.error("Failed to create account:", err);
      res.status(500).send("Failed to create account");
    });
});

module.exports = router;
