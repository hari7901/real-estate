import mongoose from 'mongoose';
const { Schema, ObjectId } = mongoose;

const adSchema = new Schema({
    // Basic Property Information
    title: {
        type: String,
        maxLength: 255,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        unique: true,
        index: true,
        lowercase: true
    },
    description: {
        type: String,
        required: true
    },

    // Media
    photos: [{
        url: String,
        Key: String,
        uploadedBy: String
    }],
    virtualTour: {
        url: String,
        type: String // e.g., '3D Tour', '360 View', 'Video Tour'
    },

    // Location Details
    address: {
        type: String,
        maxLength: 255,
        required: true,
        index: true
    },
    location: {
        type: {
            type: String,
            enum: ["Point"],
            default: "Point"
        },
        coordinates: {
            type: [Number],
            default: [75.8429213, 30.9002314]
        }
    },
    googleMap: {},
    locality: {
        landmarks: [String],
        nearbyPlaces: [{
            type: {
                type: String,
                enum: ['School', 'Hospital', 'Mall', 'Metro', 'Bus Stop', 'Park']
            },
            name: String,
            distance: Number // in kilometers
        }]
    },

    // Property Type and Status
    propertyType: {
        type: String,
        required: true,
        enum: [
            'Residential-Apartment', 'Residential-House', 'Residential-Villa',
            'Commercial-Office', 'Commercial-Shop', 'Commercial-Warehouse',
            'Industrial', 'Land-Plot', 'Agricultural'
        ]
    },
    action: {
        type: String,
        required: true,
        enum: ["Sell", "Rent"],
        default: "Sell"
    },
    status: {
        type: String,
        enum: [
            "In market",
            "Deposit taken",
            "Sold",
            "Under offer",
            "Contact agent",
            "Rented",
            "Off market"
        ],
        default: "In market"
    },

    // Property Specifications
    propertyDetails: {
        bedrooms: { type: Number, min: 0 },
        bathrooms: { type: Number, min: 0 },
        totalFloors: { type: Number, min: 0 },
        floorNumber: { type: Number, min: 0 },
        carpark: { type: Number, min: 0 },
        superBuiltUpArea: { type: Number, min: 0 },
        carpetArea: { type: Number, min: 0 },
        landsize: { type: Number, min: 0 },
        landsizetype: String,
        facing: {
            type: String,
            enum: ['North', 'South', 'East', 'West', 'North-East', 'North-West', 'South-East', 'South-West']
        }
    },

    amenities: [{
        type: String,
        enum: [
            'Parking', 'Gym', 'Swimming Pool', 'Security', 
            'Power Backup', 'Lift', 'Club House', 'Garden',
            'Intercom', 'Children Play Area', 'Fire Safety',
            'Visitor Parking', 'Water Supply 24/7', 'Shopping Center',
            'Loading Docks' 
        ]
    }],
    features: {
        type: Map,
        of: String
    },

    // Property Status
    furnishingStatus: {
        type: String,
        enum: ['Unfurnished', 'Semi-Furnished', 'Fully-Furnished']
    },
    possessionStatus: {
        type: String,
        enum: ['Ready to Move', 'Under Construction']
    },
    constructionAge: {
        type: String,
        enum: ['Under Construction', '0-1 years', '1-5 years', '5-10 years', '10+ years']
    },

    pricing: {
        price: {
            type: Number,
            required: true,
            min: 0,
            index: true
        },
        maintenanceCharges: Number,
        maintenanceFrequency: {
            type: String,
            enum: ['Monthly', 'Quarterly', 'Yearly']
        },
        priceHistory: [{
            price: Number,
            date: { type: Date, default: Date.now }
        }]
    },
        // Legal Information
    legal: {
        ownership: {
            type: String,
            enum: ['Freehold', 'Leasehold', 'Power of Attorney', 'Co-operative Society']
        },
        approvals: [String],
        reraNumber: String
    },

    // Posting Details
    postedBy: {
        type: ObjectId,
        ref: "User",
        required: true
    },
    published: {
        type: Boolean,
        default: true
    },
    inspectionTime: String,

    // Analytics
    views: {
        total: { type: Number, default: 0 },
        unique: [{ type: ObjectId, ref: 'User' }]
    },
    analytics: {
        lastViewed: Date,
        contactRequests: [{
            userId: { type: ObjectId, ref: 'User' },
            timestamp: Date,
            message: String
        }],
        shortlists: [{
            userId: { type: ObjectId, ref: 'User' },
            timestamp: Date
        }]
    },

    // Marketing
    verification: {
        isVerified: { type: Boolean, default: false },
        verifiedBy: { type: ObjectId, ref: 'User' },
        verificationDate: Date
    },
    featured: {
        isFeatured: { type: Boolean, default: false },
        startDate: Date,
        endDate: Date
    }
}, 
{ 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
adSchema.index({ location: "2dsphere" });
adSchema.index({ "pricing.basePrice": 1 });
adSchema.index({ propertyType: 1 });
adSchema.index({ action: 1 });
adSchema.index({ "analytics.lastViewed": 1 });
adSchema.index({ createdAt: -1 });

// Virtual fields
adSchema.virtual('isNew').get(function() {
    return (Date.now() - this.createdAt) < (7 * 24 * 60 * 60 * 1000); // 7 days
});

// Document middleware
adSchema.pre('save', function(next) {
    if (this.isModified('pricing.basePrice')) {
        this.pricing.priceHistory.push({
            price: this.pricing.basePrice,
            date: Date.now()
        });
    }
    next();
});

export default mongoose.model("Ad", adSchema);