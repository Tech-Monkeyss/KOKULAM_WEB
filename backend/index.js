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

//Image storage Engine
const storage = multer.diskStorage({
  destination: "./upload/images",
  filename: (req, file, cb) => {
    return cb(
      null,
      `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

const upload = multer({ storage: storage });

//crating upload en point
app.use("/images", express.static("upload/images"));
app.post("/upload", upload.single("product"), (req, res) => {
  res.json({
    success: 1,
    image_url: `http://localhost:${port}/images/${req.file.filename}`,
  });
});


// cart backend implementation

//end point of cart
app.post("/addOrder", fetchUser, async (req, res) => {
  try {
    const orderPro = new Order({
      userId: req.user.id,
      items: req.body.items,
      amount: req.body.amount,
      address: req.body.address,
    });
    await orderPro.save();

    let cart = {};
    for (let i = 0; i < 300; i++) {
      cart[i] = 0;
    }
    await Users.findByIdAndUpdate({ _id: req.user.id }, { cartData: {} });
    res.json({
      success: true,
    });
  } catch (error) {
    console.log(error);
    res.json({
      success: false,
    });
  }
});


app.listen(port, (error) => {
  if (!error) {
    console.log("Sever Running On Port " + port);
  } else {
    console("Error :" + error);
  }
});
