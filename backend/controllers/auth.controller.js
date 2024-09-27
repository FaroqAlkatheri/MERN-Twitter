import User from "../models/user.model.js";
import bcrypt from "bcryptjs";

export const signup = async (req, res) => {
    try{
        const {username, fullName, email, password} = req.body;

        const emailRegix = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
        if (!emailRegix.test(email)) {
            return res.status(400).json({
                message: "Invalid email format",
            });
        }
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({
                message: "User already exists",
            });
        }

        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({
                message: "Email already exists",
            });
        }

        //hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        //create new user
        const newUser = new User({
            username,
            fullName,
            email,
            password: hashedPassword,
        });

        if (newUser){
            generateTokenAndSetCookie(newUser._id, res);
            await newUser.save();
            res.status(201).json({
                _id: newUser._id,
                username: newUser.username,
                email: newUser.email,
                fullName: newUser.fullName,
                followers: newUser.followers,
                following: newUser.following,
                profileImg: newUser.profileImg,
                coverImg
            })
        }
        else {
            res.status(400).json({
                message: "Invalid user data",
            });
        }

    }
    catch (error) {
        console.log("Error in signup: ", error);
        res.status(500).json({
            message: "Server error",
        });
    }
};

export const login = async (req, res) => {
    res.json({
        data: "You hit the login endpoint"
    });
};

export const logout = async (req, res) => {
    res.json({
        data: "You hit the logout endpoint"
    });
}; 