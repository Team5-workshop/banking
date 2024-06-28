const router = require("express").Router();
const setup = require("../db_setup");

// 특정 사용자의 거래 내역을 조회하는 라우터
router.get("/transactions", async (req, res) => {
  const user_id = req.session.user?.user_id; // 세션에서 userid를 가져옴
  const { mongodb } = await setup();

  console.log(`${user_id}가 거래내역을 확인하려 했습니다.`);

  if (!user_id) {
    return res.redirect("/user/login");
  }

  try {
    const transactions = await mongodb
      .collection("transaction")
      .find({ user_id })
      .toArray();
    res.render("transactions", { transactions });
  } catch (err) {
    console.error("거래내역 조회 실패:", err);
    res.status(500).json({ error: err.message });
  }
});

// 전체 거래 내역을 조회하는 라우터
router.get("/transactions/list", async function (req, res) {
  try {
    const { mongodb } = await setup(); // setup()으로 connectDB 함수 호출
    const collection = mongodb.collection("transaction");
    const result = await collection.find().toArray();
    res.render("list", { data: result });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// 거래 내역을 저장하는 라우터
router.post("/transactions/submit", async function (req, res) {
  try {
    const { mongodb } = await setup(); // setup()으로 connectDB 함수 호출
    const collection = mongodb.collection("transaction");

    const transaction = {
      transaction_type: req.body.transactionType,
      from_account: req.body.accountNumber,
      to_account: req.body.recipientAccountNumber,
      amount: req.body.amount,
      transaction_date: req.body.transferTime,
    };

    await collection.insertOne(transaction);
    console.log("Transaction saved to MongoDB:", transaction);

    res.redirect("/transactions/list"); // 성공 시 /list 페이지로 리디렉션
  } catch (error) {
    console.error("Error occurred in /submit route:", error);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
