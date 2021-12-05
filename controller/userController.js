const { getDb } = require("../db");
const ObjectId = require("mongodb").ObjectId;
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

exports.registerWithUsernamePasswordController = async (req, res) => {
  const { email } = req.body;
  const user = await getDb()
    .db("todolistdb")
    .collection("users")
    .findOne({ email });
  if (user) {
    //user exist, link to forget password
    console.log(user);
    return res.status(400).json({
      error: "You already have an account with us go to forget password",
    });
  } else {
    //user does not exist, construct JWT and send email
    try {
      //generate jwt
      const token = jwt.sign({ email }, process.env.JWT_ACTIVATEACCOUNT, {
        expiresIn: "15m",
      });
      //send email
      const msg = {
        to: email,
        from: process.env.SENDGRID_SENDER,
        subject: "Activate Todolist Application",
        html: `<h1>Click the URL below to activate your Todolist Account</h1>
         <p>This URL only last for 15mins</p>
         <p>${process.env.CLIENT_URL}/activateAccount/${token}</p>`,
      };
      await sgMail.send(msg);
      return res.json({
        message: "An email has been sent to your registered email",
      });
    } catch (err) {
      console.error(err);
      console.error(JSON.stringify(err.response.body));
      return res
        .status(500)
        .json({ error: "Something went wrong. Please try again" });
    }
  }
};

exports.activateAccountController = async (req, res) => {
  const { jwtToken } = req.params;
  console.log(jwtToken);
  if (jwtToken) {
    jwt.verify(jwtToken, process.env.JWT_ACTIVATEACCOUNT, (err, decoded) => {
      if (err) {
        console.error(
          "Controller => activateAccountController =>jwt.verify :",
          err
        );
        if (err.message === "jwt expired") {
          errorMessage = "The url has expired, please register again";
        } else {
          errorMessage = "Something went wrong, please try again";
        }
        return res.status(400).json({ error: errorMessage });
      }
      //success
      return res.sendStatus(201);
    });
  } else {
    console.error("JWT token not sent, probably user alter the URL");
    return res.status(400).json({ error: "Please copy the URL again" });
  }
};

exports.createUserAccountController = async (req, res) => {
  const { password, jwtToken } = req.body;
  if (password && jwtToken) {
    jwt.verify(
      jwtToken,
      process.env.JWT_ACTIVATEACCOUNT,
      async (err, decoded) => {
        if (err) {
          console.error(
            "Controller => createUserAccountController =>jwt.verify :",
            err
          );
          if (err.message === "jwt expired") {
            errorMessage = "The url has expired, please register again";
          } else {
            errorMessage = "Something went wrong, please try again";
          }
          return res.status(400).json({ error: errorMessage });
        } //end err
        const { email } = decoded;

        if (!email || email.length === 0) {
          console.error(
            "Controller => createUserAccountController =>decoded cant find email"
          );
          return res.status(400).json({
            error: "An unexpected error occured, please register again",
          });
        }
        try {
          const hashedPassword = await bcrypt.hash(password, 10);
          const insertUser = await getDb()
            .db("todolistdb")
            .collection("users")
            .insertOne({
              email,
              password: hashedPassword,
            });

          console.log(insertUser);
          if (insertUser && insertUser.acknowledged) {
            return res.sendStatus(201);
          }
        } catch (err) {
          console.error(
            "Controller => createUserAccountController => insertUser error",
            err
          );
          if (err.toString().indexOf("E11000 duplicate key") > -1) {
            errorMessage = `${email} is already exist, click on reset password`;
          } else
            errorMessage = "An unexpected error occured, please register again";

          return res.status(400).json({
            error: errorMessage,
          });
        }
      }
    );
  } else {
    console.error(
      "ontroller => createUserAccountController =>Password or JWT not sent by client"
    );
    return res
      .status(400)
      .json({ error: "Something goes wrong, please register again." });
  }
};

exports.loginViaPasswordController = async (req, res) => {
  const { email, password } = req.body;
  if (email && password) {
    //get hashed password from DB
    try {
      const user = await getDb()
        .db("todolistdb")
        .collection("users")
        .findOne({ email });
      const hashedPassword = user.password;

      //compare password using bcrypt
      bcrypt.compare(password, hashedPassword, (err, result) => {
        if (err) {
          console.error("loginViaPassword: Bcrypt.compare : ", err);
          return res.status(400).json({ error: "An unexpected error occur" });
        }
        if (!result) {
          console.error(
            "loginViaPassword: Bcrypt.compare :  Result is empty, means password wrong"
          );
          return res
            .status(400)
            .json({ error: "Username and password does not match" });
        }

        //generate jwt
        const token = jwt.sign({ email }, process.env.JWT_LOGIN, {
          expiresIn: "1m",
        });

        return res.json({ token });
      });
    } catch (err) {
      console.error("loginViaPassword: Findone user not found : ", err);
      return res
        .status(400)
        .json({ error: "User does not exist, please register" });
    }
  } else {
    console.error("loginViaPassword: Email or Password not sent");
    return res.status(400).json({ error: "Email or password not entered" });
  }
};

exports.forgetPasswordController = async (req, res) => {
  const { email } = req.params;

  if (email) {
    try {
      const user = await getDb()
        .db("todolistdb")
        .collection("users")
        .findOne({ email });
      //user exist, generate jwt, send email
      if (user) {
        const token = jwt.sign({ email }, process.env.JWT_FORGETPASSWORD, {
          expiresIn: "15m",
        });
        //send email
        const msg = {
          to: email,
          from: process.env.SENDGRID_SENDER,
          subject: "Forget Password Link for Todolist",
          html: `<h1>To Reset Password click the Link below</h1>
         <p>This URL only last for 15mins</p>
         <p>${process.env.CLIENT_URL}/resetPassword/${token}</p>`,
        };
        await sgMail.send(msg);
        return res.json({
          message: `The reset password email has been sent to ${email}`,
        });
      } else {
        {
          console.error("forgetPassword: user not found in DB");
          return res
            .status(400)
            .json({ error: `${email} do not have an account with Todolist` });
        }
      }
    } catch (err) {
      console.error("forgetPassword: DB error", err);
      return res
        .status(500)
        .json({ error: "Unexpected error occured, please try again." });
    }
  } else {
    console.error("forgetPassword: Email not sent");
    return res.status(400).json({ error: "Email not entered" });
  }
};

exports.resetPasswordJWTCheckController = async (req, res) => {
  const { jwtToken } = req.params;
  console.log(jwtToken);
  if (jwtToken) {
    jwt.verify(jwtToken, process.env.JWT_FORGETPASSWORD, (err, decoded) => {
      if (err) {
        console.error(
          "Controller => resetPasswordJWTCheckController =>jwt.verify :",
          err
        );
        if (err.message === "jwt expired") {
          errorMessage = "The url has expired, enter your email address again";
        } else {
          errorMessage = "Something went wrong, please try again";
        }
        return res.status(400).json({ error: errorMessage });
      }
      //success
      return res.sendStatus(201);
    });
  } else {
    console.error("JWT token not sent, probably user alter the URL");
    return res.status(400).json({ error: "Please copy the URL again" });
  }
};

exports.resetPasswordController = async (req, res) => {
  const { jwtToken, updatedPassword } = req.body;

  if ((jwtToken, updatedPassword)) {
    //ensure jwt valid update password
    jwt.verify(
      jwtToken,
      process.env.JWT_FORGETPASSWORD,
      async (err, decoded) => {
        if (err) {
          console.error("resetPasswordController: jwt.verify :", err);
          if (err.message === "jwt expired") {
            errorMessage = "The url has expired, please register again";
          } else {
            errorMessage = "Something went wrong, please try again";
          }
          return res.status(400).json({ error: errorMessage });
        }
        const { email } = decoded;
        try {
          const hashedPassword = await bcrypt.hash(updatedPassword, 10);
          const updatedUser = await getDb()
            .db("todolistdb")
            .collection("users")
            .updateOne(
              {
                email,
              },
              { $set: { password: hashedPassword } }
            );
          console.log(updatedUser);
          if (updatedUser.modifiedCount === 1) {
            return res.sendStatus(201);
          }
          console.error(
            "resetPasswordController: updateOne : user found but update failed"
          );
          return res.status(500).json({
            error:
              "An Error Occured, failed to reset password, please try again",
          });
        } catch (err) {
          console.error("resetPasswordController: bcrypt error :", err);
          return res
            .status(400)
            .json({ error: "An Error Occured, please try again" });
        }
      }
    );
  } else {
    console.error("resetPasswordController: jwtToken, password was not sent");
    return res
      .status(400)
      .json({ error: "Email or Password not entered correctly" });
  }
};
