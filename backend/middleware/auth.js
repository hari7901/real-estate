import jwt from 'jsonwebtoken';
import User from '../models/user.js'

export const requireSignin = (req, res, next) => {
    try{
        const decoded = jwt.verify(
            // token which will be going inside the headers
            req.headers.authorization,
            process.env.JWT_SECRET
        );
        req.user = decoded; 
        next();
    } catch(err) {
        return res.status(401).json({
            err,
        });
    };
};

export const adminMiddleware = async (req, res, next) => {
    try{
    const user = await User.findById(req.user._id);
    
    if(!user.role.includes("Admin")){
        return res.status(403).json({
            err: "Admin resource. Access denied."
        });
    };
    
    next();
    } catch(err) {
        return res.status(401).json({
            err,
        });
    };
};