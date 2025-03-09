import { sendWelcomeEmail, sendPasswordResetEmail } from "../helpers/email.js";
import validator from 'email-validator';
import User from '../models/user.js';
import {hashPassword, comparePassword} from '../helpers/auth.js';
import {nanoid} from "nanoid";
import jwt from 'jsonwebtoken';
import { uploadImageToS3 } from '../helpers/upload.js';

export const api = (req, res) => {
    res.json({user: req.user})  
};

export const login = async (req, res) => {
    const { email, password } = req.body;
    
    if (!validator.validate(email)) {
        return res.json({ error: "A valid email is required" });
    }
    if (!email?.trim()) {
        return res.json({ error: "Email is required" });
    }
    // Correct the trim check for password by calling the function:
    if (!password?.trim()) {
        return res.json({ error: "Password is required" });
    }
    if (password.length < 6) {
        return res.json({ error: "Password should be at least 6 characters long" });
    }
    
    try {
        const user = await User.findOne({ email });
        if (!user) {
            try {
                await sendWelcomeEmail(email);
                // Await the hashed password here:
                const hashedPassword = await hashPassword(password);
                const createdUser = await User.create({
                    email,
                    password: hashedPassword,
                    username: nanoid(6),
                });
                const token = jwt.sign(
                    { _id: createdUser._id },
                    process.env.JWT_SECRET,
                    { expiresIn: '7d' }
                );
                createdUser.password = undefined;
    
                return res.json({
                    token,
                    user: createdUser
                });
            } catch (err) {
                console.error("Error during user creation or sending email:", err);
                return res.json({ error: "Invalid email. Please use a valid email address" });
            }
        } else {
            // compare password and then login
            const match = await comparePassword(password, user.password);
            if (!match) {
                return res.json({
                    error: "Wrong password",
                });
            } else {
                const token = jwt.sign(
                    { _id: user._id },
                    process.env.JWT_SECRET,
                    { expiresIn: '7d' }
                );
                user.password = undefined;
                return res.json({
                    token,
                    user,
                });
            }
        }
    } catch (err) {
        console.log("Login error", err);
        return res.json({
            error: "Something went wrong. Try again",
        });
    }
};

export const forgotPassword = async (req, res) => {
    try {
      const { email } = req.body;
      let user = await User.findOne({ email });
      if (!user) {
        return res.json({
          error: "If we find your account, you will receive an email from us shortly",
        });
      } else {
        const resetToken = nanoid(32); // The new temporary password
        const resetTokenExpiry = Date.now() + 36000000;

        user.resetPasswordToken = resetToken;
        user.resetPasswordExpiry = resetTokenExpiry;
       
        await user.save();

        const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

  
        // send email
        try {
          await sendPasswordResetEmail(email, resetUrl);
          return res.json({
            message: "Password reset link has been sent to your email",
          });
        } catch (err) {
           // if email fails, remove the reset token
          user.resetPasswordToken = undefined;
          user.resetPasswordExpiry = undefined;
          console.log("Error sending password reset email => ", err);
          return res.json({
            error: "Something went wrong. Try again."
          });
        }
      }
    } catch (err) {
      console.log("Forgot password error", err);
      res.json({ error: "Something went wrong. Try again" });
    }
  };

export const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if(!newPassword || newPassword.length < 6) {
            return res.json({
                error: "Password must be atleast 6 characters long"
            });
        }

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpiry: { $gt: Date.now() }
        });

        if(!user) {
            return res.json({
                error: "Invalid or expired reset token. Please request a new password reset"
            })
        }

        user.password = await hashPassword(newPassword);
        user.resetTokenExpiry = undefined;
        user.resetPasswordToken = undefined;
        user.forcePasswordReset = false;
        await user.save();

        return res.json({
            message: "Password has been successfully reset. Please login with your new password"
        })
    } catch(err) {
    console.log(err);
    req.json({error: "Something went wron. Try again"})
    }
}
  

export const currentUser = async (req, res) => {
    try{
       const user = await User.findById(req.user._id);
       res.json({ user });
    } catch(err){
        console.log("Current user error", err);
        res.json({
            error: "Something went wrong. Try again."
        });
    };
};

export const updatePassword = async (req, res) => {
    try{
        let { oldPassword, newPassword } = req.body;

        if(!oldPassword || oldPassword.trim() === ""){
            return res.json({
                error: "Old password is required"
            });
        }

        if(newPassword || newPassword.trim() === ""){
            return res.json({
                error: "New password is required"
            });
        }

        if(newPassword.length < 6){
            return res.json({ error: "New password must be at least 6 characters long" });
        }

        const user = await User.findById(req.user._id);
        if(!user){
            return res.json({
                error: "User not found"
            });
        }
        
        const isMatch = await comparePassword(oldPassword,newPassword);
        if(!isMatch){
            return res.json({
                error: "Old password is incorrect"
            });
        }

        const hashedPassword = await hashPassword(password);
         
        user.password = hashedPassword;
        await user.save();
        res.json({ ok: true });
    } catch(err) {
    res.json({
        error: "Something went wrong. Try again."
     });
    }
}

export const updateUsername = async (req, res) => {
    try {
      const { username } = req.body;
      if (!username) {
        return res.json({ error: "Username is required" });
      }
      const trimmedUsername = username.trim();
  
      // Check if the username is already taken by another user (exclude the current user)
      const existingUser = await User.findOne({ username: trimmedUsername });
      if (existingUser && existingUser._id.toString() !== req.user._id) {
        return res.json({
          error: "Username is already taken. Try another one"
        });
      }
  
      // Update the username
      const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { username: trimmedUsername },
        { new: true }
      );
      
      // Remove the password before sending the response
      updatedUser.password = undefined;
      return res.json(updatedUser);
    } catch (err) {
      console.error(err);
      return res.json({ error: "Something went wrong. Try again." });
    }
  };
  
  export const updateProfile = async (req, res) => {
    try {
        const { name, phone, company, address, about } = req.body;
        const updateFields = {};

        if (name) updateFields.name = name.trim();
        if (phone) updateFields.phone = phone.trim();
        if (company) updateFields.company = company.trim();
        if (address) updateFields.address = address.trim();
        if (about) updateFields.about = about.trim();

        // Handle profile picture upload
        if (req.files && req.files.photo) {
            const file = req.files.photo;
            const result = await uploadImageToS3(file, `profile-pics/${req.user._id}`);
            updateFields.photo = result.Location;
        }

        // Handle logo upload
        if (req.files && req.files.logo) {
            const file = req.files.logo;
            const result = await uploadImageToS3(file, `logos/${req.user._id}`);
            updateFields.logo = result.Location;
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            updateFields,
            { new: true }
        );

        if (!updatedUser) {
            return res.json({ error: "User not found" });
        }

        updatedUser.password = undefined;
        res.json({ user: updatedUser });
    } catch (err) {
        console.error(err);
        res.json({ error: "Something went wrong. Try again." });
    }
};