// helpers/ad.js
import Ad from "../models/ad.js";

export const incrementViewcount = async (adId) => {
  try {
    // Update to increment the 'views.total' field, not the entire 'views' object.
    await Ad.findByIdAndUpdate(adId, { $inc: { 'views.total': 1 } });
  } catch (err) {
    console.error(err);
  }
}
