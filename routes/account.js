const express = require('express');
const router = express.Router();
const ObjId = require("mongodb").ObjectId;

// 계좌번호 자동발급 (33??-??-??????)
function account_Number() {
  const part1 = `33${Math.floor(10 + Math.random() * 90)}`; 
  const part2 = Math.floor(10 + Math.random() * 90); 
  const part3 = Math.floor(100000 + Math.random() * 900000); 
  return `${part1}-${part2}-${part3}`;
}

// 뒷자리 5자리를 마스킹
function accountNoMasking(accountNo) {
  const regex = /^[0-9-]+$/;
  if (regex.test(accountNo)) {
    const length = accountNo.length;
    if (length >= 5) {
      return accountNo.slice(0, -5) + '*****';
    }
  }
  return accountNo;
}


function check(req, res, next) {
  if (!req.session.user) {
    return res.status(500).send();
  }
  next();
}
router.get("/", check, (req, res) => {
  const user_id = req.session.user.user_id; 
      mydb
      .collection("account")
      .find({ user_id })
      .toArray()
      .then(accounts => {
        // 계좌번호 마스킹
      accounts.forEach(account => {
        account.account_number = accountNoMasking(account.account_number);
      });
      res.render("account", { accounts });
    })
    .catch(err => {
      res.status(500).send();
    });
});

// 로그인 상태를 확인한 후 계좌 등록 페이지를 표시
router.get("/enter", checkLogin, (req, res) => {
  res.render("enter.ejs", { user_id: req.session.user.user_id }); // 로그인된 사용자의 user_id 사용
});

// 로그인 상태를 확인한 후 새로운 계좌를 등록
router.post("/enter", checkLogin, (req, res) => {
  const user_id = req.session.user.user_id; 
  const { account_pw, balance } = req.body; //새로운 비밀번호와 잔액을 받음
  const newAccount = {
    account_number: account_Number(), 
    account_pw,
    balance: parseInt(balance),
    user_id,
    account_pk: new ObjId(),
    account_date: new Date()
  };
  
  // account 컬렉션에 새 계좌 삽입
      mydb
      .collection("account")
      .insertOne(newAccount)
      .then(result => {
      // user 컬렉션에 계좌 정보 업데이트
      return mydb("user").updateOne(
        { user_id },
        { $push: { account_pk: newAccount.account_pk } }
      );
    })
        .then(result => {
          res.redirect("/account");
    })
        .catch(err => {
          res.status(500).send();
    });
});

module.exports = router;
