const cartModel = require('../models/cartModel');
const orderModel = require('../models/orderModel')
const Valid = require("../validator/validator");



//########################################## CEREAT ORDER  #######################################//

const createOrder = async function (req, res) {
    try {
        if (!req.body.cartId) {
            return res.status(400).send({ status: false, message: "please provide cartId in request body " })
        }

        if (!Valid.isValidObjectId(req.body.cartId)) {
            return res.status(400).send({ status: false, message: "please provide valid cartId in request body " })
        }

        let cancellable;
        if (req.body.hasOwnProperty("cancellable")) {
            if (typeof req.body.cancellable != "boolean") {
                return res.status(400).send({ status: false, message: "Cancellable must be in boolean." })
            }
            cancellable = req.body.cancellable
        } else {
            cancellable = true
        }

        let cart = await cartModel.findById(req.body.cartId, { userId: 1, items: 1, totalPrice: 1, totalItems: 1 }).populate({ path: "items.productId", select: { title: 1, price: 1, availableSizes: 1, isDeleted: 1 } }).lean()
        if (!cart) {
            return res.status(400).send({ status: false, message: "NO cart exist from this cartId" });
        }

        if (cart.userId.toString() != req.params.userId) {
            return res.status(400).send({ status: false, message: "This cartId does not belong to given userId " })
        }

        let isDublicateUser = await orderModel.findOne({ userId: req.params.userId })
        if (isDublicateUser) {
            return res.status(400).send({ status: false, message: "Order is already created for this user" })
        }

        if (cart.items.length == 0) {
            return res.status(400).send({ status: false, message: "Cart does not have any products to make orders." })
        }

        let items = []
        let totalPrice = 0
        let totalQuantity = 0
        let outOfStock = []
        let newCartItem = []
        let newCartTotalPrice=0
        
        for (let ele of cart.items) {
            if (ele.productId.availableSizes.length > 0 && ele.productId.isDeleted == false) {
                totalQuantity = totalQuantity + ele.quantity;
                totalPrice = totalPrice + (ele.quantity * ele.productId.price)
                items.push({ productId: ele.productId._id, quantity: ele.quantity })
            } else {
                outOfStock.push(ele.productId.title)
                if (ele.productId.isDeleted == false) {
                    newCartItem.push({ productId: ele.productId._id, quantity: ele.quantity })
                    newCartTotalPrice=newCartTotalPrice+(ele.quantity * ele.productId.price)
                }
            }
        }
        let totalItems = items.length
        let newCartTotalItems=newCartItem.length

        let order = {
            userId: cart.userId, items: items, totalPrice: totalPrice, totalItems: totalItems, totalQuantity: totalQuantity, cancellable: cancellable, status: "pending", deletedAt: null, isDeleted: false
        }

 
        let savedOrder = await orderModel.create(order);
        await cartModel.findByIdAndUpdate(req.body.cartId, {  items:newCartItem , totalItems: newCartTotalItems, totalPrice: newCartTotalPrice } )

        return res.status(201).send({ status: true, message: "Success", data: savedOrder });

    } catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }
}



//###################################### UPDATE ORDER #######################################//

const updateOrder = async function (req, res) {
    try {
        const userId = req.params.userId
        const { orderId, status } = req.body

        //----------------------------- Validating body -----------------------------//
        if (!Valid.isValidRequestBody(req.body)) {
            return res.status(400).send({ status: false, message: 'provide appropriate orderId and status in request body' })
        }

        if (!orderId) {
            return res.status(400).send({ status: false, message: 'provide appropriate orderId in request body' })
        }
        if (!Valid.isValidObjectId(orderId)) {
            return res.status(400).send({ status: false, message: "please provide valid orderId in request body " })
        }

        if (!status) {
            return res.status(400).send({ status: false, message: 'provide appropriate status in request body' })
        }
        if (!["completed", "cancelled"].includes(status)) {
            return res.status(400).send({ status: false, message: "Please provide status from these options only ( 'completed' or 'cancelled')." });
        }


        const findOrder = await orderModel.findOne({ _id: orderId, userId: userId })
        if (!findOrder || findOrder.isDeleted == true)
            return res.status(404).send({ status: false, message: `Order details is not found with the given OrderId: ${userId} or my be deleted` })


        if (findOrder.cancellable == false) {


            if (status == 'completed') {

                if (findOrder.status == 'pending') {
                    const updateStatus = await orderModel.findOneAndUpdate({ _id: orderId }, { $set: { status: status } }, { new: true })
                    return res.status(200).send({ status: true, message: 'Success', data: updateStatus });
                }
                if (findOrder.status == 'completed') {
                    return res.status(400).send({ status: false, message: "The status is already completed" });
                }
            }

            if (status == 'cancelled') {
                return res.status(400).send({ status: false, message: "Cannot be cancelled as it is not cancellable" })
            }
        } else {
            if (findOrder.status == 'cancelled') {
                return res.status(400).send({ status: false, message: "The status is cancelled, you cannot change the status" });
            }
            if (findOrder.status == 'completed') {
                return res.status(400).send({ status: false, message: "The status is already completed" });
            }

            const updateStatus = await orderModel.findOneAndUpdate({ _id: orderId }, { $set: { status: status } }, { new: true })
            return res.status(200).send({ status: true, message: 'Success', data: updateStatus });

        }

    } catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }
}



module.exports = { createOrder, updateOrder }
