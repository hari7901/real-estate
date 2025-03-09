# Real Estate Marketplace API

A robust RESTful API for a real estate marketplace built with Node.js, Express, and MongoDB. This API provides secure user authentication, property listing with geolocation-based search, and comprehensive ad management features including image processing with AWS S3 and transactional email notifications via AWS SES.

## Features

- **Secure Authentication:**  
  Implements JWT-based authentication and rate limiting for enhanced security.

- **Property Listings:**  
  Supports geospatial indexing in MongoDB for efficient property search and filtering.

- **Image Processing:**  
  Integrates AWS S3 for dynamic image uploads (with resizing using Sharp) and deletions.

- **Ad Management:**  
  Includes functionalities such as ad creation, update, deletion, contact agent, wishlist toggling, and enquiry tracking.

- **Transactional Emails:**  
  Sends welcome emails, password reset emails, and contact notifications via AWS SES.

## Technologies Used

- **Backend:** Node.js, Express
- **Database:** MongoDB (with Mongoose)
- **Authentication:** JSON Web Tokens (JWT)
- **Cloud Services:** AWS S3, AWS SES
- **Image Processing:** Sharp
- **Utilities:** Multer, Rate Limit, Helmet, Compression

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/real-estate-marketplace-api.git
   cd real-estate-marketplace-api
2. Install dependencies:
   npm install

3. Create a .env file in the root directory with the following variables (adjust values as needed):

    DATABASE=mongodb+srv://<username>:<password>@cluster.mongodb.net/yourdbname?retryWrites=true&w=majority
    JWT_SECRET=your_jwt_secret
    AWS_ACCESS_KEY_ID=your_aws_access_key_id
    AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
    AWS_REGION=your_aws_region
    AWS_BUCKET_NAME=your_bucket_name
    EMAIL_FROM="Real Estate <your_email@domain.com>"
    EMAIL_TO=your_email@domain.com
    CLIENT_URL=http://localhost:3000
    GOOGLE_MAPS_API_KEY=your_google_maps_api_key

   # Running the Project

   1. Start ther server:
      npm start

   2. API Endpoints:
      Used postman to test the following endpoints:-

      Authentication:

      POST /api/login – Log in (or auto-register)
      POST /api/forgot-password – Request a password reset email
      GET /api/current-user – Get current user details
      PUT /api/update-password – Update password
      PUT /api/update-username – Update username
      PUT /api/update-profile – Update user profile



      Ads Management:
      
      POST /api/upload-image – Upload images (using multer)
      DELETE /api/remove-image – Remove image from AWS S3
      POST /api/create-ad – Create a new ad
      GET /api/ad/:slug – Read a single ad
      GET /api/ads-for-sell/:page – List properties for sale (paginated)
      GET /api/ads-for-rent/:page – List properties for rent (paginated)
      PUT /api/update-ad/:slug – Update an ad
      DELETE /api/delete-ad/:slug – Delete an ad
      GET /api/user-ads/:page – Get ads posted by the current user
      PUT /api/update-ad-status/:slug – Update ad status
      POST /api/contact-agent – Contact the agent for an ad
      PUT /api/toggle-wish-list/:adId – Toggle wishlist for an ad
      GET /api/wishlist/:page – Get wishlist ads (paginated)
      POST /api/search-ads – Search for ads
      PUT /api/toggle-published/:adId – Toggle published status (admin)
