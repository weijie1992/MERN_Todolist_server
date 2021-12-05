const jwt = require("jsonwebtoken");

exports.jwtCheck = (req, res, next) => {
    console.log(req.header("Authorization"));
    // console.log(req);
  const Authorization = req.header("Authorization");
  if (Authorization) {
    const token = Authorization.split("Bearer ")[1];
    jwt.verify(token, process.env.JWT_LOGIN, (err, decoded) => {
      if (err) {
        if (err.message === "jwt expired") {
          console.error("jwtCheck: JWT Expired");
          return res.status(401).json({ error: "JWT Expired" });
        } else {
          console.error("jwtCheck: Non-jwt expired error");
          return res
            .status(400)
            .json({ error: "Something Went wrong, please relogin" });
        }
      }
      req.email = decoded.email;
      next();
    });
  } else 
  return res.status(403).json({ error: "JWT Token not sent" });
};
