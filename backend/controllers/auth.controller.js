import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import { generateTokenAndSetCookie } from "../lib/utils/generateToken.js";

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

        if (password.length < 6) {
            return res.status(400).json({
                message: "Password should be at least 6 characters",
            });
        };
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
                coverImg: newUser.coverImg,
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
    try {
        const { username, password } = req.body;
        const user = await User.findOne({username});

        const isMatch = await bcrypt.compare(password, user?.password || "");
        if (!isMatch || !user) {
            return res.status(400).json({
                message: "Invalid credentials",
            });
        }

        generateTokenAndSetCookie(user._id, res);
        res.status(200).json({
            _id: user._id,
            username: user.username,
            email: user.email,
            fullName: user.fullName,
            followers: user.followers,
            following: user.following,
            profileImg: user.profileImg,
            coverImg: user.coverImg,
        });


    }
    catch (error) {
        console.log("Error in login: ", error);
        res.status(500).json({
            message: "Server error",
        });
    }
};

export const logout = async (req, res) => {
    try {
        res.cookie("jwt", "", {maxAge: 0});
        res.status(200).json({message: "Logged out successfully"});
    }

    catch (error) {
        console.log("Error in logout: ", error);
        res.status(500).json({message: "Server error"});
    }
}; 

export const getMe = async (req, res) => {
    try{
    const user = req.user;
    res.status(200).json(user);
    }
    catch (error) {
        console.log("Error in getMe: ", error);
        res.status(500).json({message: "Server error"});
    }
}

