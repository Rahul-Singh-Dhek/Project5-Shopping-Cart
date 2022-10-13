const productModel = require("../models/productModel");
const valid = require("../validator/validator");
const jwt = require("jsonwebtoken");
const { uploadFile } = require("../controller/awsController");

var nameRegex = /^[a-zA-Z\s]*$/;
var priceRegex = /^[1-9]\d*(\.\d+)?$/;
var installmentRegex = /\d/;

const createProduct = async (req, res) => {
    try {
        let data = req.body;
        let {
            title,
            description,
            price,
            currencyId,
            currencyFormat,
            availableSizes,
            style,
            installments,
            isFreeShipping,
        } = data;
        if (Object.keys(data).length === 0) {
            return res
                .status(400)
                .send({ status: false, msg: "Request body is empty" });
        }
        let objectCreate = {};

        let requiredField = [
            "title",
            "description",
            "price",
            "currencyId",
            "currencyFormat",
        ];
        for (field of requiredField) {
            if (!data[field]) {
                return res
                    .status(400)
                    .send({
                        status: false,
                        msg: `${field} is not present in request body`,
                    });
            }
        }

        if (!valid.isValid(title))
            return res.status(400).send({ status: false, msg: "title is invalid" });
        objectCreate.title = title;

        if (!valid.isValid(description))
            return res
                .status(400)
                .send({ status: false, msg: "description is invalid" });
        objectCreate.description = description;

        if (priceRegex.test(price) == false)
            return res
                .status(400)
                .send({ status: false, message: "you entered a invalid price" });
        objectCreate.price = price;

        if (!valid.isValid(currencyId)) {
            return res
                .status(400)
                .send({ status: false, msg: "currencyId is invalid" });
        }
        if (!valid.isValid(currencyFormat)) {
            return res
                .status(400)
                .send({ status: false, msg: "currencyFormat is invalid" });
        }
        if (currencyId !== "INR")
            return res
                .status(400)
                .send({ status: false, msg: "currencyId format is wrong" });
        objectCreate.currencyId = currencyId;

        let titleVerify = await productModel.findOne({ title: title });
        if (titleVerify) {
            return res
                .status(400)
                .send({ status: false, msg: "title is already present" });
        }
        //    currencyFormat
        let checkCurrencyFormat = "₹";
        if (currencyFormat != checkCurrencyFormat)
            return res
                .status(400)
                .send({
                    status: false,
                    message:
                        "you entered a invalid currencyFormat--> currencyFormat should be ₹",
                });
        objectCreate.currencyFormat = currencyFormat;

        //image
        let image = req.files;
        if (!image || image.length == 0)
            return res
                .status(400)
                .send({ status: false, message: "Profile Image field is Required" });
        let productImage = await uploadFile(image[0]);
        objectCreate.productImage = productImage;

        //style (if it is present)
        if (style) {
            if (nameRegex.test(style) == false)
                return res
                    .status(400)
                    .send({ status: false, message: "STyle to enterd is invalid" });
            objectCreate.style = style;
        }

        //avalableSizes

        if (!availableSizes)
            return res
                .status(400)
                .send({ status: false, message: "Available Sizes field is Required" });

        let checkSizes = ["S", "XS", "M", "X", "L", "XXL", "XL"];
        let arrayOfSizes = availableSizes.trim().split(" ");

        for (let i = 0; i < arrayOfSizes.length; i++) {
            if (checkSizes.includes(arrayOfSizes[i].trim())) continue;
            else
                return res
                    .status(400)
                    .send({
                        status: false,
                        message: "Sizes should in this ENUM only S/XS/M/X/L/XXL/XL",
                    });
        }

    if(isFreeShipping){
      if(typeof(isFreeShipping)!==Boolean){
        return res.status(400).send({ status: false, message: "Free Shipping is Must be A Boolean" });
      }
    }

    let newSize = [];
    for (let j = 0; j < arrayOfSizes.length; j++) {
      if (newSize.includes(arrayOfSizes[j].trim())) continue;
      else newSize.push(arrayOfSizes[j].trim());
    }

        objectCreate.availableSizes = newSize;

        // installment (if given)
        if (installments || installments === "") {
            if (!installments)
                return res
                    .status(400)
                    .send({ status: false, message: "Installment is empty" });
            if (installmentRegex.test(installments) == false)
                return res
                    .status(400)
                    .send({
                        status: false,
                        message: "Installment  you entered is invalid",
                    });
            objectCreate.installments = installments;
        }
        //---------------------------------------------------------------------------------------
        let productCreate = await productModel.create(objectCreate);
        return res
            .status(201)
            .send({
                status: true,
                message: "Document is created successfully",
                data: productCreate,
            });
    } catch (error) {
        res.status(500).send({ status: false, err: error.message });
    }
};

const getProduct = async (req, res) => {
    try {
        let filter = { isDeleted: false };
        if (req.query.size) {
            if (valid.isValid(req.query.size) && valid.isValidSize(req.query.size)) {
                filter.availableSizes = req.query.size;
            } else {
                return res
                    .status(400)
                    .send({ status: false, message: "please provide valid size" });
            }
        }

        if (req.query.name) {
            if (valid.isValid(req.query.name) && /^[a-zA-Z ]$/.test(req.query.name)) {
                filter.title = { $regex: req.query.name, $options: "$i" };
            } else {
                return res
                    .status(400)
                    .send({ status: false, message: "please provide valid name" });
            }
        }

        if (req.query.priceGreaterThan) {
            if (valid.isValidPrice(req.query.priceGreaterThan)) {
                req.query.priceGreaterThan = Number(req.query.priceGreaterThan);
                filter.price = { $gt: req.query.priceGreaterThan };
            } else {
                return res
                    .status(400)
                    .send({ status: false, message: "please provide valid Price" });
            }
        }

        if (req.query.priceLessThan) {
            if (valid.isValidPrice(req.query.priceLessThan)) {
                req.query.priceLessThan = Number(req.query.priceLessThan);
                if (filter.price) {
                    filter.price.$lt = req.query.priceLessThan;
                } else {
                    filter.price = { $lt: req.query.priceLessThan };
                }
            } else {
                return res
                    .status(400)
                    .send({ status: false, message: "please provide valid Price" });
            }
        }

        let savedData;

        if (req.query.priceSort) {
            req.query.priceSort = req.query.priceSort.trim();
            if (["-1", "1"].indexOf(req.query.priceSort) < 0) {
                return res
                    .status(400)
                    .send({
                        status: false,
                        message: "please provide valid value in priceSort",
                    });
            }
            if (req.query.priceSort == "1") {
                console.log(filter);
                savedData = await productModel.find(filter).sort({ price: 1 });
            } else if (req.query.priceSort == "-1") {
                console.log(filter);
                savedData = await productModel.find(filter).sort({ price: -1 });
            }
        } else {
            console.log(filter);
            savedData = await productModel.find(filter);
        }

        if (savedData.length == 0) {
            return res.status(404).send({ status: false, message: "No data found" });
        }
        return res.status(200).send({ status: true, data: savedData });
    } catch (error) {
        res.status(500).send({ status: false, err: error.message });
    }
};



//--------------------------------------- Updates a product  --------------------------//

const updateProductById = async function (req, res) {
try {
    let productId = req.params.productId
    let data = req.body
    let files=req.files
    let {title, description, price, currencyId, currencyFormat,  availableSizes, style, installments, isFreeShipping } = data;
  
      if (Object.keys(data).length === 0) {
      return res.status(400).send({ status: false, msg: "Request body is empty" });
  };
    let NewObject={}

  if (!valid.isValidObjectId(productId)) {
        return res.status(400).send({ status: false, msg: "Product id is not valid" })};

    const CheckProduct=await productModel.findById(productId)
    if(!CheckProduct){ return res.status(400).send({ status: false, msg: "Product is not Find" })}

    

//----------------------------- Updating title -----------------------------//

if(title ||title===""){
  title=title.trim()
     if (!valid.isValid(title)){
        return res.status(400).send({ status: false, msg: "title is invalid" })};
     
      let titleVerify = await productModel.findOne({ title: title });
    if (titleVerify) {
      return res.status(400).send({ status: false, msg: "title is already present" })}
      NewObject.title = title.trim()
    };

//----------------------------- Updating description -----------------------------//

if(description ||description===""){
  description=description.trim()
   if (!valid.isValid(description)){
      return res.status(400).send({ status: false, msg: "description is invalid" })};
      NewObject.description = description
};

//----------------------------- Updating price -----------------------------//

if(price || price===""){
  price=price.trim()
    if (priceRegex.test(price) == false){
      return res.status(400).send({ status: false, message: "you entered a invalid price" })};
      NewObject.price = price
    };

//----------------------------- Updating currencyId -----------------------------//

if(currencyId ||currencyId===""){ 
  currencyId=currencyId.trim()
    if (!valid.isValid(currencyId)) {
      return res.status(400).send({ status: false, msg: "currencyId is invalid" }) }
    if (currencyId !== "INR"){
      return res.status(400).send({ status: false, msg: "currencyId format is wrong" })}
      NewObject.currencyId = currencyId;
    };

//----------------------------- Updating currencyFormat -----------------------------//

if(currencyFormat ||currencyFormat===""){
  currencyFormat=currencyFormat.trim()
    if (!valid.isValid(currencyFormat)) {
      return res.status(400).send({ status: false, msg: "currencyFormat is invalid" })}
    let checkCurrencyFormat = "₹";
    if (currencyFormat != checkCurrencyFormat){
      return res.status(400).send({status: false, message: "you entered a invalid currencyFormat--> currencyFormat should be ₹",})}
      Object.currencyFormat = currencyFormat;
  };

//------------------------------- Updating Product Image ----------------------------------//

 if(files[0]) {
  if(files[0].originalname === "" ){
   
    return res.status(400).send({ status: false, msg: " productImage is invalid" })}
  
  let safeFile=await uploadFile(files[0]);
  NewObject.productImage = safeFile}



//----------------------------- Updating style -----------------------------//

if (style ||style==="") {
  style=style.trim()
  if (nameRegex.test(style) == false){
    return res.status(400).send({ status: false, message: "STyle to enterd is invalid" })}
    NewObject.style = style;
}

//----------------------------- Updating installments -----------------------------//
if (installments || installments === "") {
  installments=installments.trim()
  if (!installments)
    return res.status(400).send({ status: false, message: "Installment is empty" });
if (installmentRegex.test(installments) == false){
    return res.status(400).send({status: false,message: "Installment  you entered is invalid"})}
    NewObject.installments = installments;
}

//----------------------------- Updating AvailableSizes -----------------------------//

if(availableSizes|| availableSizes===""){
  availableSizes=availableSizes.trim()
  if(!valid.isValid(availableSizes)){ 
     return res.status(400).send({status: false,message: "Available Sizes is invalid"});}

  let checkSizes = ["S", "XS", "M", "X", "L", "XXL", "XL"];
  let arrayOfSizes = CheckProduct.availableSizes.concat(availableSizes)

for (let i = 0; i < arrayOfSizes.length; i++) {
  if (checkSizes.includes(arrayOfSizes[i].trim())) continue;
else
  return res.status(400).send({status: false,message: "Sizes should in this ENUM only S/XS/M/X/L/XXL/XL"});
}

let newSize = [];
   for (let j = 0; j < arrayOfSizes.length; j++) {
    if (newSize.includes(arrayOfSizes[j].trim())) continue;
else newSize.push(arrayOfSizes[j].trim());
}
NewObject.availableSizes = newSize;
}

if(isFreeShipping){
  if(typeof(isFreeShipping)!==Boolean){
    return res.status(400).send({ status: false, message: "Free Shipping is Must be A Boolean" });
  }
}

const updateProduct=await productModel.findByIdAndUpdate(productId,NewObject,{new :true})
return res.status(200).send({status:true ,message: "Update is successfully",data:updateProduct});




    } catch (error) {
        res.status(500).send({ status: false, err: error.message });
    }
}

module.exports = { createProduct, getProduct,updateProductById };
