import User from '../models/user.model.js';
import Post from '../models/post.model.js';
import Notification from '../models/notification.model.js';
import {v2 as cloudinary} from 'cloudinary';
import e from 'express';

export const createPost = async (req, res) => {
    try {
        //retrive text and image from req.body and userId from req.user
        const text = req.body.text;
        let image = req.body.image; // image is optional
        const userId = req.user._id.toString();

        //check if user exists in db
        const user = await User.findById(userId).select("name profilePic");
        if (!user) return res.status(404).json({message: "User not found"});

        //check if post has text or image (atleast one is required)
        if (!text && !image) return res.status(400).json({message: "Post must have text or image"});

        //if image is present, upload image to cloudinary and get image url
        if (image) {
            const uploadedResponse = await cloudinary.uploader.upload(image)
            image = uploadedResponse.secure_url;
        }
        //create new post object with user, text and image
        const newPost = new Post({
            user: userId,
            text,
            image,
        });

        //save newPost to db
        await newPost.save();
        res.status(201).json({message: "Post created successfully", post: newPost});

    }
    catch (error) {
        res.status(500).json({message: error.message});
        console.error("error in createPost controller",error);
    }
}

export const likePost = async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.user._id;
        
        //find post by postId and check if post exists
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({message: "Post not found"});

        //check if user has already liked the post
        if (post.likes.includes(userId)) {
            //unlike post
            await Post.updateOne({_id: postId}, {$pull: {likes: userId}});
            await User.updateOne({_id: userId}, {$pull: {likedPosts: postId}});
            return res.status(200).json({message: "Post unliked successfully"});
        }
        else {
            post.likes.push(userId);
            await User.updateOne({_id: userId}, {$push: {likedPosts: postId}});
            await post.save();

            const notification = new Notification( {
                from: userId,
                to: post.user,
                type: "like",
            }
        );
        await notification.save();
        }
        
        res.status(200).json({message: "Post liked successfully"});
    }
    catch (error) {
        res.status(500).json({message: error.message});
        console.error("error in likePost",error);
    }
}

export const commentPost = async (req, res) => {
    try {
        //retrive text from req.body and postId from req.params and userId from req.user
        const text = req.body.text;
        const postId = req.params.id;
        const userId = req.user._id;

        //check if comment has text
        if (!text) return res.status(400).json({message: "Comment must have text"});
        //find post by postId and check if post exists
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({message: "Post not found"});

        //create new comment object with text and userId
        const newComment = {
            text,
            user: userId,
        };

        //push newComment to post.comments array and save post
        post.comments.push(newComment);
        await post.save();

        res.status(200).json({message: "Comment added successfully", post});
    }
    catch (error) {
        res.status(500).json({message: error.message});
        console.error("error in commentPost",error);
    }
}   

export const deletePost = async (req, res) => { 
    try {
        const postId = req.params.id;
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({message: "Post not found"});
        }

        if (post.user.toString() !== req.user._id.toString()) {
         return res.status(403).json({message: "You are not authorized to delete this post"});
        }

        if (post.image) {
            const imgId = post.image.split("/").pop().split(".")[0];
            await cloudinary.uploader.destroy(imgId);
        }

        await Post.findByIdAndDelete(postId);
        res.status(200).json({message: "post deleted successfully"});
    }
    catch (error) {
        res.status(500).json({message: error.message});
        console.error("error in deletePost",error);
    }
}

export const getAllPosts = async (req, res) => {
    try {
        //populate user and comments.user fields and sort posts by createdAt in descending order
        //populate is used to replace the specified path in the document with document(s) from other collection(s)
        //sort is used to sort the documents based on the given field in ascending or descending order
        const posts = await Post.find().sort({createdAt: -1}).populate({
            path: "user",
            select: "-password -email",
        })
        .populate({
            path: "comments.user",
            "select": "-password -email",
        });

        if (posts.length === 0) {
            return res.status(200).json([]);
        }
        res.status(200).json(posts);
    }
    catch (error) {
        res.status(500).json({message: error.message});
        console.error("error in getAllPosts",error);
    }
}

export const getLikedPosts = async (req, res) => {
    const userId = req.params.id;
    try {
        //find user by userId and check if user exists
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({message: "User not found"});
        const likedPosts = await Post.find({_id: {$in: user.likedPosts}})
        .populate({
            path: "user",
            select: "-password -email",
        })
        .populate({
            path: "comments.user",
            select: "-password -email",
        });
        
        if (likedPosts.length === 0) {
            return res.status(200).json([]);
        }

        res.status(200).json(likedPosts);

    }
    catch (error) {
        res.status(500).json({message: error.message});
        console.error("error in getLikedPosts",error);
    }
}

export const getFollowingPosts = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({message: "User not found"});

        const following = user.following;

        const followingPosts = await Post.find({user: {$in: following}})
        .sort({ createdAt: -1 })
        .populate({
            path: "user",
            select: "-password -email",
        })
        .populate({
            path: "comments.user",
            select: "-password -email",
        });
        res.status(200).json(followingPosts);

    }
    catch (error) {
        res.status(500).json({message: error.message});
        console.error("error in getFollowingPosts",error);
    }
}

export const getUserPosts = async (req, res) => {
    try { 
        const username = req.params.username;
        const user = await User.findOne({username});
        if (!user) return res.status(404).json({message: "User not found"});
        const userPosts = await Post.find({user: user._id})
        .sort({createdAt: -1})
        .populate({
            path: "user",
            select: "-password -email",
        })
        .populate({
            path: "comments.user",
            select: "-password -email",
        });
    }

    catch (error) {
        res.status(500).json({message: error.message});
        console.error("error in getUserPosts",error);
    }
}
