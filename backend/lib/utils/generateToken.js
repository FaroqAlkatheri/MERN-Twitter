import jwt from 'jsonwebtoken';

export const generateTokenAndSetCookie = (id, res) => {
    const token = jwt.sign({ userId: id }, process.env.JWT_SECRET, {
        expiresIn: "15d",
    });
    res.cookie("jwt", token, {
        maxAge: 15 * 24 * 60 * 60 * 1000, //MS
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV !== "development",
        });
};
