const jwt = require("jsonwebtoken");
const mongoose = require('mongoose')
const userModel = require("../models/UserModel")


// =======================================================AUTHENTICATION==============================================


const authentication = (req, res, next) => {
    try {
        let token = req.headers.authorization;
        if (!token) {
            return res.status(401).send({ status: false, msg: "token is required" });
        } else {
            console.log(token)
            token = token.split(' ')[1]
        }
        jwt.verify(token, "YousufAbhayRahulAnand", (error, decodedtoken) => {
            if (error) {
                const msg = error.message === "jwt expired"? "Token is expired": "Token is invalid";
                return res.status(401).send({ status: false, message:msg });
            }
            else {
                req.token = decodedtoken;
                next();
            }
        });
    } catch (error) {
        res.status(500).send({ status: false, err: error.message });
    }
};

// ======================================================AUTHORISATION BY userId=======================================================

const authorisationbyBId = async function (req, res, next) {
    try {
        let userId = req.params.userId
        let decodedtoken = req.token
        if (!userId) {
            return res.status(400).send({ status: false, message: "Please enter a user ID." });
        }
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).send({ status: false, message: 'Invalid user id' });
        }

        let userData = await userModel.findOne({ _id: userId, isDeleted: false })
        if (!userData) {
            return res.status(404).send({ status: false, message: 'No user exists with that id or Might be Deleted' });
        }
        // console.log(decodedtoken.userId)
        // console.log(userData._id.toString())

        if ((decodedtoken.userId !== userData._id.toString())) {
             return res.status(403).send({ status: false, message: "You are not a authorized user" }) 
        };
        next();

    } catch (error) {
        return res.status(500).send({ status: false, msg: error.message })

    }
}

// ==============================================================================================================================

module.exports = { authentication, authorisationbyBId }
