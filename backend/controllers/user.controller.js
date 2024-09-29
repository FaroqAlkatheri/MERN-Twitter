import User from "../models/user.model.js";

export const getUserProfile = async (req, res) => {
    const username = req.params.username;
    console.log("username",username);
    
    try {
        const user = await User.findOne({username}).select("-password");
        if (!user) {
            return res.status(404).json({message: "User not found"});
        }
        res.status(200).json(user);
}
    catch (error) {
        res.status(500).json({message: error.message});
        console.error("error in getUserProfile",error);
    }
};

export const followUnfollowUser = async (req, res) => {
    try {
        const id = req.params.id;
        console.log("Loggeed user", req.user);
        const userToModify = await User.findById(id);
        console.log("User to modify", userToModify);
        const currentUser = req.user;
        console.log("Current user", currentUser);
        
        console.log(id === req.user._id.toString());

        if (id === req.user._id.toString()) {
            return res.status(400).json({message: "You cannot follow/unfollow yourself"});
        }

        if (!userToModify || !currentUser) {
            return res.status(404).json({message: "User not found"});
        }

        const isFollowing = currentUser.following.includes(id);
        if(isFollowing) {
            // unfollow
            await User.findByIdAndUpdate(id, {$pull: {followers: req.user._id}});
            await User.findByIdAndUpdate(req.user._id, {$pull: {following: id}});
            res.status(200).json({message: "Unfollowed"});
        }
        else {
            // follow
            await User.findByIdAndUpdate(id, {$push: {followers: req.user._id}});
            await User.findByIdAndUpdate(req.user._id, {$push: {following: id}});
            res.status(200).json({message: "Followed"});
            // send notification
        }

    }
    catch (error) {
        res.status(500).json({message: error.message});
        console.error("error in followUnfollowUser",error);
    }
}

export const updateUserProfile = async (req, res) => {
    res.status(200).json({message: "update user profile API"});
}


