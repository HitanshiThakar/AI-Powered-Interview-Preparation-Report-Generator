import jwt from "jsonwebtoken"
import tokenBlacklistModel from "../models/blacklist.model.js"
import mongoose from "mongoose"
import { userModel } from "../models/user.model.js"


async function authUser(req,res,next){
    const token = req.cookies?.token

    if(!token){
        return res.status(401).json({
            message: "Token not provided."
        })
    }

    let decoded
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET, {
            algorithms: ["HS256"]
        })
    } catch {
        return res.status(401).json({
            message: "Invalid token."
        })
    }

    if (
        !decoded ||
        typeof decoded !== "object" ||
        typeof decoded.id !== "string" ||
        !mongoose.isObjectIdOrHexString(decoded.id)
    ) {
        return res.status(401).json({
            message: "Invalid token."
        })
    }

    const isTokenBlacklisted = await tokenBlacklistModel.exists({ token })
    if (isTokenBlacklisted) {
        return res.status(401).json({
            message: "Token is invalid. Please login again."
        })
    }

    const user = await userModel.findById(decoded.id).select("_id username email")
    if (!user) {
        return res.status(401).json({
            message: "Invalid token."
        })
    }

    req.user = {
        id: user._id.toString(),
        username: user.username,
        email: user.email
    }

    return next()

}

export default {
    authUser
}