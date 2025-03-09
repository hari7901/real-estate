import express from "express";
// import everything as auth which is * as auth
import {login, forgotPassword, api, currentUser, updatePassword, updateUsername, updateProfile, resetPassword} from "../controllers/auth.js";
import {requireSignin} from "../middleware/auth.js";
import { enquiredAds, wishlist } from "../controllers/ads.js";

const router = express.Router();

router.get("/", requireSignin, api);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/current-user', requireSignin, currentUser);
router.put('/change-password', requireSignin, updatePassword);
router.put('/update-username', requireSignin, updateUsername);
router.put('/update-profile', requireSignin, updateProfile )
router.get('/enquired-ads/:page', requireSignin, enquiredAds)
router.get('/wishlist/:page', requireSignin, wishlist);

export default router;