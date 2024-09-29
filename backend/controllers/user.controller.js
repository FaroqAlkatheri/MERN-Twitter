import User from "../models/user.model.js";
import { v2 as cloudinary } from "cloudinary";
import Notification from "../models/notification.model.js";
import bcrypts from "bcryptjs";


export const getUserProfile = async (req, res) => {
    const username = req.params.username;
    console.log("username",username);
    
    try {
        const user = await User.findOne({username}).select("-password");
        // check if the user exists in the database
        if (!user) {
            return res.status(404).json({message: "User not found"});
        }
        res.status(200).json(user);
}
    // catch any errors and send a response with the error message
    catch (error) {
        res.status(500).json({message: error.message});
        console.error("error in getUserProfile",error);
    }
};

export const followUnfollowUser = async (req, res) => {
    // get the id of the user to follow/unfollow
    try {
        const id = req.params.id;
        //user to follow/unfollow
        const userToModify = await User.findById(id);
        //logged in user
        const currentUser = req.user;
        console.log("Current user", currentUser);
        
        console.log(id === req.user._id.toString());
        // check if the user is trying to follow/unfollow themselves
        if (id === req.user._id.toString()) {
            return res.status(400).json({message: "You cannot follow/unfollow yourself"});
        }
        // check if the user to follow/unfollow exists
        if (!userToModify || !currentUser) {
            return res.status(404).json({message: "User not found"});
        }
        // check if the user is already following the user
        const isFollowing = currentUser.following.includes(id);
        // follow/unfollow logic
        if(isFollowing) {
            // unfollow
            await User.findByIdAndUpdate(id, {$pull: {followers: req.user._id}});
            await User.findByIdAndUpdate(req.user._id, {$pull: {following: id}});
            //TODO return the id of the user as a response
            res.status(200).json({message: "Unfollowed"});
        }
        else {
            // follow
            await User.findByIdAndUpdate(id, {$push: {followers: req.user._id}});
            await User.findByIdAndUpdate(req.user._id, {$push: {following: id}});
            // send notification
            const newNotification = new Notification({
                from: req.user._id,
                to: id,
                type: "follow",
            }); 
            await newNotification.save();
            
            //TODO return the id of the user as a response
            res.status(200).json({message: "Followed"});
            
        }

    }
    catch (error) {
        res.status(500).json({message: error.message});
        console.error("error in followUnfollowUser",error);
    }
}


export const getSuggestedUsers = async (req, res) => {
    // get the id of the logged in user
    try {
        const userId = req.user._id;

        const usersFollowing = await User.findById(userId).select("following");
        // get 10 random users from the database
        const users = await User.aggregate([
            {
            // get users who are not the logged in user
            $match :{
                _id: {$ne: userId}
            },
            },
            {
            // get 10 random users
            $sample: {size: 10},
            }
        ]);
        // filter out users who are already being followed by the logged in user
        const filteredUsers = users.filter(user => !usersFollowing.following.includes(user._id));
        // return the first 4 users as suggested users
        const suggestedUsers = filteredUsers.slice(0, 4);
        // remove password from the response
        suggestedUsers.forEach(user => user.password = undefined);
        // send the suggested users as a response
        res.status(200).json(suggestedUsers);
    }

    catch (error) {
        // catch any errors and send a response with the error message
        res.status(500).json({message: error.message});
        console.error("error in getSuggestedUsers",error);
    }
}


export const updateUser = async (req, res) => {
    // get the user details from the request body
    const {fullName, username, email, bio, link, currentPassword, newPassword} = req.body;
    // get the profile and cover images from the request body
    // let is used to declare variables that are limited to the scope of a block statement, or expression on which it is used.
    let { profileImg, coverImg } = req.body;
    const userId = req.user._id;
    try {
        // find the user in the database and check if they exist
        let user = await User.findById(userId);
        if (!user) return res.status(404).json({message: "User not found"});

        // password update logic
        if ((newPassword && !currentPassword) || (!newPassword && currentPassword)) {
            return res.status(400).json({message: "Please provide both current and new password"});
        };

        if (currentPassword && newPassword) {
            const isMatch = await bcrypts.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({message: "Invalid password"});
            }
            if (newPassword.length < 6) {
                return res.status(400).json({message: "Password should be at least 6 characters long"});
            }

            const salt = await bcrypts.genSalt(10); // create salt
            user.password = await bcrypts.hash(newPassword, salt); // hash the password
        }

        // image update logic
        if (profileImg) {
            if (user.profileImg) {
                // delete the previous profile image from cloudinary
                // split the url to get the public id of the image
                // public id is the name of the image without the extension
                // public id is used to delete the image from cloudinary
                await cloudinary.uploader.destroy(user.profileImg.split("/").pop().split(".")[0]);
            }
            const response = await cloudinary.uploader.upload(profileImg)
                profileImg = response.secure_url;
        }
        // image update logic
        if (coverImg) {
            if (user.coverImg) {
                // delete the previous profile image from cloudinary
                // split the url to get the public id of the image
                // public id is the name of the image without the extension
                // public id is used to delete the image from cloudinary
                await cloudinary.uploader.destroy(user.coverImg.split("/").pop().split(".")[0]);
            }
            const response = await cloudinary.uploader.upload(coverImg)
            coverImg = response.secure_url;
        }

        // update user details in the database  
        user.fullName = fullName || user.fullName;
        user.username = username || user.username;
        user.email = email || user.email;
        user.bio = bio || user.bio;
        user.link = link || user.link;
        user.profileImg = profileImg || user.profileImg;
        user.coverImg = coverImg || user.coverImg;

        user = await user.save();
        // remove password from the response
        user.password = null;
        return res.status(200).json(user);

    }

    catch (error) {
        
        res.status(500).json({message: error.message});
        console.error("error in updateUser",error);
    }
}