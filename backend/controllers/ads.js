import { uploadImageToS3, deleteImageFromS3 } from '../helpers/upload.js';
import { geocodeAddress } from "../helpers/google.js";
import Ad from '../models/ad.js';
import User from '../models/user.js'; // Ensure User model is imported
import { nanoid } from 'nanoid';
import slugify from 'slugify';
import { sendContactEmailToAgent } from '../helpers/email.js';
import { incrementViewcount } from '../helpers/ad.js';
import mongoose from 'mongoose';

export const uploadImage = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.json({ error: "Image is required" });
    }
    // Ensure req.files is always an array
    const files = Array.isArray(req.files) ? req.files : [req.files];

    // Upload images to S3
    const results = await uploadImageToS3(files, req.user._id);
    console.log("Upload results =>", results);
    return res.json({ results });
  } catch (err) {
    console.error("Upload image error =>", err);
    return res.json({ error: "Upload image failed" });
  }
};

export const removeImage = async (req, res) => {
  console.log("removeImage route triggered. Request body:", req.body);
  try {
    const { Key, uploadedBy } = req.body;
    // Check ownership
    if (req.user._id !== uploadedBy) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    // Delete from S3
    await deleteImageFromS3(Key);
    return res.json({ success: true });
  } catch (err) {
    console.error("Remove image error =>", err);
    return res.json({ error: "Remove image failed" });
  }
};

export const createAd = async (req, res) => {
  try {
    const {
      title,
      description,
      address,
      propertyType,
      action,
      pricing = {},
      propertyDetails,
      amenities,
      furnishingStatus,
      possessionStatus,
      constructionAge,
      legal,
      inspectionTime,
      published = true
    } = req.body;

    // Required field validation
    if (!title) return res.json({ error: "Title is required" });
    if (!description) return res.json({ error: "Description is required" });
    if (!address) return res.json({ error: "Address is required" });
    if (!propertyType) return res.json({ error: "Property Type is required" });
    if (!action) return res.json({ error: "Property Action (Sell/Rent) is required" });
    if (!pricing.price) return res.json({ error: "Price is required" });

    // Check if images are provided
    if (!req.files || req.files.length === 0) {
      return res.json({ error: "At least one image is required" });
    }

    // Ensure req.files is always an array
    const files = Array.isArray(req.files) ? req.files : [req.files];

    // Upload images to S3
    const uploadedImages = await uploadImageToS3(files, req.user._id);

    // Extract the necessary image data
    const photos = uploadedImages.map(image => ({
      url: image.Location,
      Key: image.Key,
      uploadedBy: req.user._id
    }));

    // Geocode the address
    const { location, googleMap } = await geocodeAddress(address);

    // Create slug
    const slug = slugify(
      `${propertyType}-${action}-${address}-${pricing.price}-${nanoid(6)}`
    ).toLowerCase();

    // Create new Ad document
    const newAd = new Ad({
      title,
      description,
      photos,
      slug,
      address,
      location: {
        type: "Point",
        coordinates: [location.coordinates[0], location.coordinates[1]]
      },
      googleMap,
      propertyType,
      action,
      propertyDetails,
      amenities,
      furnishingStatus,
      possessionStatus,
      constructionAge,
      pricing: {
        price: pricing.price,
        maintenanceCharges: pricing.maintenanceCharges,
        maintenanceFrequency: pricing.maintenanceFrequency,
        priceHistory: [{
          price: pricing.price,
          date: Date.now()
        }]
      },
      legal,
      postedBy: req.user._id,
      published,
      inspectionTime,
      views: { total: 0, unique: [] },
      analytics: {
        contactRequests: [],
        shortlists: []
      }
    });

    await newAd.save();

    // Update user role to Seller if not already
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $addToSet: { role: "Seller" } },
      {
        new: true,
        select: '-password'
      }
    );

    res.json({
      success: true,
      message: "Property listing created successfully",
      ad: newAd,
      user: updatedUser
    });

  } catch (err) {
    console.error("Error in createAd:", err);
    res.status(500).json({
      success: false,
      error: "Failed to create property listing. Please try again."
    });
  }
};

// ------------------------
// 3) Read Single Ad + Related
// ------------------------
export const readAd = async (req, res) => {
  try {
    const { slug } = req.params;
    const ad = await Ad.findOne({ slug })
      .select('-googleMap')
      // Fix typo: changed "photot" to "photo"
      .populate('postedBy', "name username email phone photo logo");

    if (!ad) {
      return res.status(404).json({ error: "Ad not found" });
    }

    // Find related ads
    const related = await Ad.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: ad.location.coordinates,
          },
          distanceField: "dist.calculated",
          maxDistance: 50000, // 50 km
          spherical: true
        },
      },
      {
        $match: {
          _id: { $ne: ad._id },
          action: ad.action,
          propertyType: ad.propertyType
        }
      },
      { $limit: 3 },
      { $project: { googleMap: 0 } }
    ]);

    // Populate "postedBy" in those related ads
    const relatedWithPopulatedPostedBy = await Ad.populate(related, {
      path: 'postedBy',
      select: 'name username email phone company photo logo'
    });

    // increment view count
    incrementViewcount(ad._id);

    res.json({ ad, related: relatedWithPopulatedPostedBy });
  } catch (err) {
    console.log(err);
    res.json({ error: "Failed to fetch. Try again." });
  }
};

export const listAds = async (req, res) => {
  try {
    const page = parseInt(req.params.page) || 1;
    const pageSize = 2;
    const skip = (page - 1) * pageSize;

    // Optional filter: if the query parameter "action" is provided, filter by it.
    const filter = {};
    if (req.query.action) {
      filter.action = req.query.action;
    }

    const totalAds = await Ad.countDocuments(filter);
    const ads = await Ad.find(filter)
      .populate("postedBy", "name username email phone company photo logo")
      .select("-googleMap")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize);

    res.json({
      ads,
      page,
      totalPages: Math.ceil(totalAds / pageSize)
    });
  } catch (err) {
    console.log(err);
    res.json({ error: "Failed to fetch. Try again." });
  }
};

export const updateAd = async (req, res) => {
  try {
      const { slug } = req.params;
      const {
          // Basic Property Information
          title,
          description,
          photos,
          virtualTour,

          // Location Details
          address,
          locality,

          // Property Type and Status
          propertyType,
          action,
          status,

          // Property Specifications
          propertyDetails,

          // Amenities and Features
          amenities,
          features,

          // Property Status
          furnishingStatus,
          possessionStatus,
          constructionAge,

          // Pricing Details
          pricing: {
              displayPrice,
              basePrice,
              pricePerUnit,
              maintenanceCharges,
              maintenanceFrequency,
              bookingAmount,
              otherCharges
          } = {},

          // Legal Information
          legal: {
              ownership,
              approvals,
              reraNumber
          } = {},

          // Additional Details
          inspectionTime,
          published
      } = req.body;

      // Required field validation
      const requiredFields = {
          title: "Title",
          description: "Description",
          photos: "Photos",
          address: "Address",
          propertyType: "Property Type",
          action: "Property Action (Sell/Rent)",
          displayPrice: "Display Price",
          basePrice: "Base Price"
      };

      for (const [field, label] of Object.entries(requiredFields)) {
          if (!req.body[field] || (Array.isArray(req.body[field]) && !req.body[field].length)) {
              return res.json({ error: `${label} is required` });
          }
      }

      // Find and verify ownership
      const ad = await Ad.findOne({ slug }).populate("postedBy", "_id");
      if (!ad) {
          return res.status(404).json({ error: "Ad not found" });
      }
      if (ad.postedBy._id.toString() !== req.user._id.toString()) {
          return res.status(401).json({ error: "Unauthorized" });
      }

      // Property type specific validation
      if (propertyType === "Land-Plot") {
          if (!propertyDetails?.landsize) {
              return res.json({ error: "Land size is required for Land plots" });
          }
          if (!propertyDetails?.landsizetype) {
              return res.json({ error: "Land size type is required for Land plots" });
          }
      }

      // Geocode the address if changed
      let locationData = {};
      if (address && address !== ad.address) {
          const { location, googleMap } = await geocodeAddress(address);
          locationData = {
              location: {
                  type: "Point",
                  coordinates: [location.coordinates[0], location.coordinates[1]]
              },
              googleMap
          };
      }

      // Create new slug
      const newSlug = slugify(
          `${propertyType}-${action}-${address}-${displayPrice}-${nanoid(6)}`
      ).toLowerCase();

      // Prepare update object
      const updateData = {
          // Basic Information
          title,
          description,
          photos,
          virtualTour,
          slug: newSlug,

          // Location
          address,
          ...locationData,
          locality,

          // Property Details
          propertyType,
          action,
          status,
          propertyDetails,
          amenities,
          features,
          furnishingStatus,
          possessionStatus,
          constructionAge,

          // Pricing
          pricing: {
              displayPrice,
              basePrice,
              pricePerUnit,
              maintenanceCharges,
              maintenanceFrequency,
              bookingAmount,
              otherCharges
          },

          // Legal
          legal: {
              ownership,
              approvals,
              reraNumber
          },

          // Additional Details
          published,
          inspectionTime
      };

      // Remove undefined fields
      Object.keys(updateData).forEach(key => 
          updateData[key] === undefined && delete updateData[key]
      );

      // Perform update
      const updatedAd = await Ad.findOneAndUpdate(
          { slug },
          updateData,
          { 
              new: true,
              runValidators: true
          }
      ).populate('postedBy', 'name username email phone company photo logo');

      res.json({
          success: true,
          message: "Property listing updated successfully",
          ad: updatedAd
      });

  } catch (err) {
      console.error("Error in updateAd:", err);
      res.status(500).json({
          success: false,
          error: "Failed to update property listing. Please try again."
      });
  }
};


export const deleteAd = async (req, res) => {
  try {
    const { slug } = req.params;
    const ad = await Ad.findOne({ slug }).populate("postedBy", "_id");

    if (!ad) {
      return res.status(404).json({ error: "Ad not found" });
    }
    if (ad.postedBy._id.toString() !== req.user._id.toString()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const deletedAd = await Ad.deleteOne({ slug });
    // Return just once
    return res.json({
      ok: true,
      deletedAd
    });
  } catch (err) {
    console.log(err);
    res.json({ error: "Delete ad failed" });
  }
};

// ------------------------
// 8) Fetch User Ads (Paginated)
// ------------------------
export const userAds = async (req, res) => {
  try {
    // Fixed the typo from apge => page
    const page = req.params.page ? parseInt(req.params.page) : 1;
    const pageSize = 2;
    const skip = (page - 1) * pageSize;

    const totalAds = await Ad.countDocuments({ postedBy: req.user._id });
    const ads = await Ad.find({ postedBy: req.user._id })
      .select('-googleMap')
      .populate('postedBy', 'name username email phone company photo logo')
      .skip(skip)
      .limit(pageSize)
      .sort({ createdAt: -1 });

    return res.json({
      ads,
      page,
      totalPages: Math.ceil(totalAds / pageSize)
    });
  } catch (err) {
    console.log(err);
    res.json({ error: "Failed to fetch. Try again." });
  }
};

// ------------------------
// 9) Update Ad Status
// ------------------------
export const updateAdStatus = async (req, res) => {
  try {
    const { slug } = req.params;
    const { status } = req.body;

    const ad = await Ad.findOne({ slug });
    if (!ad) {
      return res.status(404).json({ error: "Ad not found" });
    }
    if (ad.postedBy._id.toString() !== req.user._id.toString()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    ad.status = status;
    await ad.save();

    // Only send one response
    return res.json({
      ok: true,
      ad
    });
  } catch (err) {
    console.log(err);
    res.json({ error: "Failed to update status. Try again" });
  }
};

// ------------------------
// 10) Contact Agent
// ------------------------
export const contactAgent = async (req, res) => {
  try {
    const { adId, message } = req.body;
    const ad = await Ad.findById(adId).populate("postedBy");

    if (!ad) {
      return res.status(404).json({ error: "Ad not found" });
    }

    // Add to user's enquiredProperties
    const user = await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { enquiredProperties: adId }
    });

    // Send contact email
    await sendContactEmailToAgent(ad, user, message);
    res.json({ ok: true });
  } catch (err) {
    console.log(err);
    res.json({ error: "Failed to contact agent. Try again." });
  }
};

// ------------------------
// 11) Fetch Enquired Ads
// ------------------------
export const enquiredAds = async (req, res) => {
  try {
    const page = req.params.page ? parseInt(req.params.page) : 1;
    const pageSize = 2;
    const skip = (page - 1) * pageSize;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Count how many enquired ads
    const totalAds = await Ad.countDocuments({
      _id: { $in: user.enquiredProperties }
    });

    // Paginate
    const ads = await Ad.find({ _id: { $in: user.enquiredProperties } })
      .select('-googleMap')
      .populate('postedBy', 'name username email phone company photo logo')
      .skip(skip)
      .limit(pageSize)
      .sort({ createdAt: -1 });

    return res.json({
      ads,
      page,
      totalPages: Math.ceil(totalAds / pageSize)
    });
  } catch (err) {
    console.log(err);
    res.json({ error: "Failed to fetch. Try again." });
  }
};

// ------------------------
// 12) Toggle Wishlist
// ------------------------
export const toggleWishlist = async (req, res) => {
  try {
    const adId = req.params.adId;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.json({ error: "User not found" });
    }

    // Compare wishlist ObjectIds as strings
    const isInWishList = user.wishlist.some((id) => id.toString() === adId);

    // Convert the adId string into an ObjectId
    const objectAdId = new mongoose.Types.ObjectId(adId);

    // Toggle
    const update = isInWishList
      ? { $pull: { wishlist: objectAdId } }
      : { $addToSet: { wishlist: objectAdId } };

    const updatedUser = await User.findByIdAndUpdate(userId, update, { new: true });

    return res.json({
      ok: true,
      message: isInWishList ? "Ad removed from wishlist" : "Ad added to wishlist",
      wishlist: updatedUser.wishlist
    });
  } catch (err) {
    console.error(err);
    res.json({ error: "Failed to toggle wishlist. Try again." });
  }
};

// ------------------------
// 13) Fetch Wishlist Ads
// ------------------------
export const wishlist = async (req, res) => {
  try {
    const page = req.params.page ? parseInt(req.params.page) : 1;
    const pageSize = 2;
    const skip = (page - 1) * pageSize;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const totalAds = await Ad.countDocuments({ _id: { $in: user.wishlist } });

    const ads = await Ad.find({ _id: { $in: user.wishlist } })
      .select("-googleMap")
      .populate("postedBy", "name username email phone company photo logo")
      .skip(skip)
      .limit(pageSize)
      .sort({ createdAt: -1 });

    return res.json({
      ads,
      page,
      totalPages: Math.ceil(totalAds / pageSize)
    });
  } catch (err) {
    console.log(err);
    return res.json({ error: "Failed to fetch. Try again" });
  }
};

export const advancedSearch = async (req, res) => {
  try {
      const {
          // Basic Search Parameters
          address,
          propertyType,
          action,
          page = 1,
          sortBy = 'newest',
          sortOrder = 'desc',
          radius = 10,

          // Price Range
          minPrice,
          maxPrice,

          // Property Specifications
          propertyDetails: {
              bedrooms,
              bathrooms,
              totalFloors,
              floorNumber,
              carpark,
              superBuiltUpArea,
              carpetArea,
              landsize,
              landsizetype,
              facing,
              floorPreference // 'Low' (1-5), 'Mid' (6-12), 'High' (>12)
          } = {},

          // Area Range
          areaRange: {
              minArea,
              maxArea,
              areaType = 'super' // 'carpet' or 'super'
          } = {},

          // Status and Features
          furnishingStatus,
          possessionStatus,
          constructionAge,
          amenities = [],
          requiredAmenities = [], // Must have all these
          viewType,

          // Legal Information
          legal: {
              ownership,
              reraNumber
          } = {},

          // Date Filters
          postedWithin, // '24h', '7d', '30d', '90d'

          // Location Preferences
          locationPreferences: {
              preferred = [],
              excluded = []
          } = {},

          // Additional Filters
          verifiedOnly,
          featuredOnly,
          maintenanceFrequency,
          isNew,
          specialFeatures = []
      } = req.body;

      const pageSize = 12;

      if (!address) {
          return res.json({ error: "Address is required" });
      }

      const geo = await geocodeAddress(address);

      // Build base query
      const query = {
          published: true,
          location: {
              $geoWithin: {
                  $centerSphere: [
                      [geo.location.coordinates[0], geo.location.coordinates[1]],
                      radius / 6378.1
                  ]
              }
          }
      };

      // Basic filters
      if (action) query.action = action;
      if (propertyType) query.propertyType = propertyType;
      if (furnishingStatus) query.furnishingStatus = furnishingStatus;
      if (possessionStatus) query.possessionStatus = possessionStatus;
      if (constructionAge) query.constructionAge = constructionAge;

      // Price filter
      if (minPrice || maxPrice) {
          query['pricing.price'] = {};
          if (minPrice) query['pricing.price'].$gte = parseFloat(minPrice);
          if (maxPrice) query['pricing.price'].$lte = parseFloat(maxPrice);
      }

      // Area filters
      const areaField = areaType === 'carpet' ? 
          'propertyDetails.carpetArea' : 'propertyDetails.superBuiltUpArea';
      if (minArea || maxArea) {
          query[areaField] = {};
          if (minArea) query[areaField].$gte = parseFloat(minArea);
          if (maxArea) query[areaField].$lte = parseFloat(maxArea);
      }

      // Property detail filters
      if (bedrooms) query['propertyDetails.bedrooms'] = bedrooms;
      if (bathrooms) query['propertyDetails.bathrooms'] = bathrooms;
      if (totalFloors) query['propertyDetails.totalFloors'] = totalFloors;
      if (carpark) query['propertyDetails.carpark'] = carpark;
      if (facing) query['propertyDetails.facing'] = facing;

      // Floor preference
      if (floorPreference) {
          const floorRanges = {
              'Low': { $lte: 5 },
              'Mid': { $gt: 5, $lte: 12 },
              'High': { $gt: 12 }
          };
          if (floorRanges[floorPreference]) {
              query['propertyDetails.floorNumber'] = floorRanges[floorPreference];
          }
      }

      // Legal filters
      if (ownership) query['legal.ownership'] = ownership;
      if (reraNumber) query['legal.reraNumber'] = reraNumber;

      // Special filters
      if (verifiedOnly) query['verification.isVerified'] = true;
      if (featuredOnly) query['featured.isFeatured'] = true;
      if (maintenanceFrequency) query['pricing.maintenanceFrequency'] = maintenanceFrequency;

      // Date filter
      if (postedWithin) {
          const dateFilters = {
              '24h': 24 * 60 * 60 * 1000,
              '7d': 7 * 24 * 60 * 60 * 1000,
              '30d': 30 * 24 * 60 * 60 * 1000,
              '90d': 90 * 24 * 60 * 60 * 1000
          };
          if (dateFilters[postedWithin]) {
              query.createdAt = {
                  $gte: new Date(Date.now() - dateFilters[postedWithin])
              };
          }
      }

      // Amenities filters
      if (amenities.length || requiredAmenities.length) {
          query.amenities = {};
          if (amenities.length) query.amenities.$in = amenities;
          if (requiredAmenities.length) query.amenities.$all = requiredAmenities;
      }

      // Location preferences
      if (preferred.length || excluded.length) {
          query.$and = [];
          if (preferred.length) {
              query.$and.push({
                  'locality.landmarks': { $in: preferred }
              });
          }
          if (excluded.length) {
              query.$and.push({
                  'locality.landmarks': { $nin: excluded }
              });
          }
      }

      // Special features and view type
      if (specialFeatures.length) {
          query.features = { $in: specialFeatures };
      }
      if (viewType) {
          query['features.view'] = viewType;
      }

      // Sorting
      const sortOptions = {};
      switch (sortBy) {
          case 'price_asc':
              sortOptions['pricing.price'] = 1;
              break;
          case 'price_desc':
              sortOptions['pricing.price'] = -1;
              break;
          case 'newest':
              sortOptions.createdAt = -1;
              break;
          case 'oldest':
              sortOptions.createdAt = 1;
              break;
          case 'views':
              sortOptions['views.total'] = -1;
              sortOptions.createdAt = -1;
              break;
          case 'featured':
              sortOptions['featured.isFeatured'] = -1;
              sortOptions.createdAt = -1;
              break;
          default:
              sortOptions.createdAt = -1;
      }

      // Execute search
      const ads = await Ad.find(query)
          .select("-googleMap")
          .populate("postedBy", "name username email phone company photo logo")
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .sort(sortOptions);

      const total = await Ad.countDocuments(query);

      return res.json({
          success: true,
          ads,
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
          filters: {
              appliedFilters: {
                  address,
                  propertyType,
                  action,
                  price: { minPrice, maxPrice },
                  area: { minArea, maxArea, areaType },
                  propertyDetails: {
                      bedrooms,
                      bathrooms,
                      totalFloors,
                      floorNumber,
                      carpark,
                      facing,
                      floorPreference
                  },
                  furnishingStatus,
                  possessionStatus,
                  constructionAge,
                  amenities,
                  requiredAmenities,
                  viewType,
                  legal: { ownership, reraNumber },
                  locationPreferences: { preferred, excluded },
                  specialFeatures,
                  verifiedOnly,
                  featuredOnly,
                  maintenanceFrequency,
                  postedWithin
              },
              sortBy,
              sortOrder,
              radius
          }
      });

  } catch (err) {
      console.error("Advanced search error:", err);
      res.status(500).json({
          success: false,
          error: "Search failed. Please try again."
      });
  }
};