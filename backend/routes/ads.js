import express from 'express';
import { adminMiddleware, requireSignin } from '../middleware/auth.js';
import multer from 'multer';
import {
  createAd,
  removeImage,
  uploadImage,
  readAd,
  updateAd,
  deleteAd,
  userAds,
  updateAdStatus,
  contactAgent,
  toggleWishlist,
  enquiredAds, // only if you want to handle enquired ads here, but it's typically in 'auth.js'
  advancedSearch,
  listAds,
} from '../controllers/ads.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload-image', requireSignin, upload.any(), uploadImage);
router.delete('/remove-image', requireSignin, removeImage);
router.post('/create-ad', requireSignin, createAd);
router.get('/ad/:slug', readAd);
router.get('/ads/:page', listAds);
router.put('/update-ad/:slug', requireSignin, updateAd);
router.delete('/delete-ad/:slug', requireSignin, deleteAd);
router.get('/user-ads/:page', requireSignin, userAds);
router.put('/update-ad-status/:slug', requireSignin, updateAdStatus);
router.post('/contact-agent', requireSignin, contactAgent);
router.put('/toggle-wish-list/:adId', requireSignin, toggleWishlist);
router.post('/search-ads', advancedSearch);
router.get('/enquired-ads/:page', requireSignin, enquiredAds);

export default router;

let newPromise = new Promise(function(myResolve, myReject){
  let req = new XMLHttpRequest();
  req.open("","");
  req.onload = function() {
    if(req.status == 200){
      myResolve(req.response)
    } else {
      myReject("File not found");
    }
  }
  req.send();
})
