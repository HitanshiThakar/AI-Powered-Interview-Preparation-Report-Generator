import { userModel } from "../models/user.model.js"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import tokenBlacklistModel from "../models/blacklist.model.js"

const authCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
}

const authTokenMaxAge = 24 * 60 * 60 * 1000

/**
 * @name registerUserContoller
 * @description register a new user, expects username, email and password in required
 * @access Public
 */

async function registerUserContoller(req,res) {
    
    const { username, email, password } = req.body

    if(!username || !email || !password){
        return res.status(400).json({
            message: "Please provide username, email and password"
        })
    }

    const isUserAlreadyExists = await userModel.findOne({
        $or: [ {username}, {email} ]
    })

    if(isUserAlreadyExists){

        /*isUserAlreadyExists.username == username */
        return res.status(400).json({
            message: "Account already exists with this email address or username"
        })
    }

    const hash = await bcrypt.hash(password, 10)

    const user = await userModel.create({
        username,
        email,
        password: hash
    })

    const token = jwt.sign(
        { id: user._id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: "1d", algorithm: "HS256" }
    )

    res.cookie("token", token, {
        ...authCookieOptions,
        maxAge: authTokenMaxAge
    })

    res.status(201).json({
        message: "User registered successfully",
        user: {
            id: user._id,
            username: user.username,
            email: user.email
        }
    })

}

/**
 * @name loginUserController
 * @description login a user, expects email and password in the request body
 * @access Public
 */
async function loginUserController(req,res) {
    
    const { email, password } = req.body

    if (!email || !password) {
        return res.status(400).json({
            message: "Invalid email or password"
        })
    }

    const user = await userModel.findOne({ email })

    if(!user){
        return res.status(400).json({
            message: "Invalid email or password"
        })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)

    if(!isPasswordValid){
        return res.status(400).json({
            message: "Invalid email or password"
        })
    }

    const token = jwt.sign(
        {id:user._id, username:user.username},
        process.env.JWT_SECRET,
        { expiresIn: "1d", algorithm: "HS256" }
    )

    res.cookie("token", token, {
        ...authCookieOptions,
        maxAge: authTokenMaxAge
    })

    res.status(200).json({
        message: "User logged in successfully",
        user: {
             id:user._id,
             username: user.username,
             email:user.email
        }
           
    })
}

/**
 * @name logoutUserController
 * @description clear token from user cookie and add the token in blacklist
 * @access Public
 */
async function logoutUserController(req,res){
    const token = req.cookies?.token

    if(token){
        let decodedToken

        try {
            decodedToken = jwt.verify(token, process.env.JWT_SECRET, {
                algorithms: ["HS256"]
            })
        } catch {
            decodedToken = null
        }

        if (decodedToken) {
            await tokenBlacklistModel.create({ token })
        }
    }
    res.clearCookie("token", authCookieOptions)

    res.status(200).json({
        message: "User logged out successfully"
    })
}

/**
 * @name getMeController
 * @description get the current logged in user details
 * @access private
 */
async function getMeController(req,res) {

    const user = await userModel.findById(req.user.id)

    if (!user) {
        return res.status(401).json({
            message: "Invalid token."
        })
    }

    res.status(200).json({
        message: "User details fetched successfully",
        user: {
            id : user._id,
            username : user.username,
            email: user.email
        }
    })

    
}



export default {
     registerUserContoller,
    loginUserController,
    logoutUserController,
    getMeController,
}
