const express = require('express')
const router = express.Router()
const userController= require("../controller/userController")
const cartController=require("../controller/cartController")
const productController= require("../controller/productController")
const awsController= require("../controller/awsController")

const{authentication,authorisation,authorisationbyBId}=require("../middleware/middle")

const aws= require("aws-sdk")

// ======================================USER APIs============================================//
router.post("/register",userController.createUser)
router.post("/login",userController.loginUser)
router.put("/user/:userId/profile",authentication,authorisationbyBId,userController.updateUser)
router.get("/user/:userId/profile",authentication,userController.getUser)

// ======================================PRODUCT APIs ============================================//
router.post("/products",productController.createProduct)
router.get("/products",productController.getProduct)
router.put("/products/:productId",productController.updateProductById)

router.get("/products/:productId",productController.getProductById)
router.delete("/product/:productId",productController.deleteProduct)

//=================================== CART APIs  ================================================//
router.post("/users/:userId/cart",cartController.createCart)




router.all("/*", (req, res) => 
{ console.log(req.query)
    res.status(400).send({ status: false, message: "Endpoint is not correct" }) })


module.exports = router;
