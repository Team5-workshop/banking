const router = require("express").Router();
const setup = require("../db_setup");
const sha = require("sha256");

router.get('/register', (req, res) => {
    res.render('register');
  });
  
  router.post('/register', async (req, res) => {
    const { user_id, user_email, user_pw, user_name } = req.body;
    const hashedPassword = sha(user_pw);
  
    const newUser = new User({
      user_id,
      user_email,
      user_pw: hashedPassword,
      user_name,
    });
  
    try {
      await newUser.save();
      res.redirect('/user/login');
    } catch (err) {
      res.status(500).send('Error registering new user.');
    }
  });
  
  router.get('/login', (req, res) => {
    res.render('login');
  });
  
  router.post('/login', async (req, res) => {
    const { user_email, user_pw } = req.body;
    const hashedPassword = sha(user_pw);
  
    try {
      const user = await User.findOne({ user_email, user_pw: hashedPassword });
      if (!user) {
        return res.status(401).send('Invalid email or password');
      }
  
      req.session.userId = user._id;
      res.redirect('/');
    } catch (err) {
      res.status(500).send('Error logging in.');
    }
  });
  
  router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
  });



module.exports = router;
