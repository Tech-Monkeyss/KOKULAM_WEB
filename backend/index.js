const port = process.env.PORT || 4000;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const { sendWelcomeEmail } = require("./mail");

app.use(express.json());
app.use(cors());

//database connection with mongodb

mongoose.connect(
  "mongodb+srv://kandypan7:MJZrSStId56WKsyZ@cluster0.s2wzt.mongodb.net/HARISH"
);

//API creation

app.get("/", (req, res) => {
  res.send("Express App Is Running");
});

//user image

const userIMg = multer.diskStorage({
  destination: "./upload/userImages",
  filename: (req, file, cb) => {
    return cb(
      null,
      `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

const userUpload = multer({ storage: userIMg });

//crating user image upload en point
app.use("/userImages", express.static("upload/userImages"));
app.post("/userImg", userUpload.single("user"), (req, res) => {
  res.json({
    success: 1,
    image_url: `http://localhost:${port}/userImages/${req.file.filename}`,
  });
});

//shema creating for user model

const Users = mongoose.model("Users", {
  name: {
    type: String,
  },
  email: {
    type: String,
    unique: true,
  },
  phoneNumber: {
    type: String,
    unique: false, // Unique index on phoneNumber
  },
  password: {
    type: String,
  },
  image: {
    type: String,
  },
  cartData: {
    type: Object,
    default: {},
  },
  wishData: {
    type: Object,
  },
  data: {
    type: Date,
    default: Date.now,
  },
});

//creating End point the user
app.post("/signup", async (req, res) => {
  let check = await Users.findOne({ email: req.body.email });
  if (check) {
    return res.status(400).json({
      success: false,
      message: "Existing User Found With Same Email.",
    });
  }
  let cart = {};
  for (let i = 0; i < 300; i++) {
    cart[i] = 0;
  }
  let wish = {};
  for (let i = 0; i < 300; i++) {
    wish[i] = 0;
  }
  const user = new Users({
    name: req.body.username,
    email: req.body.email,
    password: req.body.password,
    wishData: wish,
    image: req.body.image,
  });
  await user.save();
  sendWelcomeEmail(user.email, user.name);

  const data = {
    user: {
      id: user.id,
    },
  };

  const token = jwt.sign(data, "secret_ecom");
  res.json({ success: true, token });
});
//user login
app.post("/login", async (req, res) => {
  let user = await Users.findOne({ email: req.body.email });

  if (user) {
    const passCompare = req.body.password === user.password;
    if (passCompare) {
      const data = {
        user: {
          id: user.id,
        },
      };
      const token = jwt.sign(data, "secret_ecom");
      res.json({ success: true, token });
    } else res.json({ success: false, errors: "Wrong PassWord" });
  } else {
    res.json({ success: false, errors: "Wrong Email" });
  }
});

//middleware to fetch
const fetchUser = async (req, res, next) => {
  const token = req.header("auth-token");
  if (!token) {
    res.status(401).send({ errors: "Please Authenticate using valid token" });
  } else {
    try {
      const data = jwt.verify(token, "secret_ecom");
      req.user = data.user;
      next();
    } catch (error) {
      res.send({ errors: "Please Authenticate using  a valid token" });
    }
  }
};

// Endpoint to get details of the current logged-in user
app.get("/me", fetchUser, async (req, res) => {
  try {
    // Fetch user details using the user ID from the token payload
    const user = await Users.findById(req.user.id);

    // Send the user details in the response
    res.json({
      success: true,
      user: {
        //id: user._id,
        name: user.name,
        email: user.email,
        image: user.image,
        phoneNumber: user.phoneNumber,
        // Include any other user details you want to send
      },
    });
  } catch (error) {
    // If an error occurs, send an error response
    console.error("Error fetching user details:", error);
    res.status(500).json({ success: false, error: "Server Error" });
  }
});
//end point for wish
app.post("/addtowish", fetchUser, async (req, res) => {
  console.log("Added", req.body.itemId);
  let userData = await Users.findOne({ _id: req.user.id });

  userData.wishData[req.body.itemId] = 1;
  await Users.findByIdAndUpdate(
    { _id: req.user.id },
    { wishData: userData.wishData }
  );
  res.send("Added");
});
///remove from wish end point
app.post("/removefromwish", fetchUser, async (req, res) => {
  console.log("Removed", req.body.itemId);
  let userData = await Users.findOne({ _id: req.user.id });

  if (userData.wishData[req.body.itemId] > 0)
    userData.wishData[req.body.itemId] -= 1;
  await Users.findByIdAndUpdate(
    { _id: req.user.id },
    { wishData: userData.wishData }
  );
  res.send("Removed");
});
// end point of wish
app.post("/getwish", fetchUser, async (req, res) => {
  console.log("Get Wish");
  let userData = await Users.findOne({ _id: req.user.id });
  res.json(userData.wishData);
});
//  endpoint for deactivating user account and logging out
app.delete("/deleteUser", fetchUser, async (req, res) => {
  try {
    // Fetch the logged-in user's ID from the token payload
    const userId = req.user.id;

    // Delete the user from the database
    await Users.findByIdAndDelete(userId);

    res.json({ success: true, message: "User account deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ success: false, error: "Server Error" });
  }
});

// Backend endpoint for updating user details
app.put("/updateUser/:id", fetchUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phoneNumber, email, image } = req.body;

    // Update user details in the database
    await Users.findByIdAndUpdate(userId, {
      name,
      phoneNumber,
      email,
      image,
    });

    res.json({ success: true, message: "User details updated successfully" });
  } catch (error) {
    console.error("Error updating user details:", error);
    res.status(500).json({ success: false, error: "Server Error" });
  }
});

