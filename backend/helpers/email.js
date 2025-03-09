import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const client = new SESClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  apiVersion: process.env.AWS_API_VERSION,
});

export const sendWelcomeEmail = async (email) => {
  const params = {
    Source: process.env.EMAIL_FROM,
    ReplyToAddresses: [process.env.EMAIL_TO],
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: `
            <html>
              <body>
                <p>Good day! Welcome to ${process.env.APP_NAME} and thank you for joining us.</p>
                <div style="margin:20px auto;">
                  <a href="${process.env.CLIENT_URL}" style="margin-right:50px">Browse properties</a>
                  <a href="${process.env.CLIENT_URL}/post-ad">Post ad</a>
                </div>
                <i>Team ${process.env.APP_NAME}</i>
              </body>
            </html>
          `,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: `Welcome to ${process.env.APP_NAME}`,
      },
    },
  };

  const command = new SendEmailCommand(params);
  try {
    const data = await client.send(command);
    return data;
  } catch (err) {
    console.error("SES Error:", err);
    throw err;
  }
};

export const sendPasswordResetEmail = async (email, resetUrl) => {
  const params = {
      Source: process.env.EMAIL_FROM,
      ReplyToAddresses: [process.env.EMAIL_TO],
      Destination: {
          ToAddresses: [email],
      },
      Message: {
          Body: {
              Html: {
                  Charset: "UTF-8",
                  Data: `
                      <!DOCTYPE html>
                      <html>
                      <head>
                          <meta charset="UTF-8">
                          <meta name="viewport" content="width=device-width, initial-scale=1.0">
                      </head>
                      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; background-color: #f4f4f4;">
                          <div style="max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
                              <!-- Header with Logo -->
                              <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #eee;">
                                  <h1 style="color: #2c3e50; margin: 0; font-size: 28px;">${process.env.APP_NAME}</h1>
                              </div>

                              <!-- Main Content -->
                              <div style="padding: 30px 0;">
                                  <h2 style="color: #2c3e50; margin: 0 0 20px; font-size: 24px;">Password Reset Request</h2>
                                  
                                  <p style="color: #555; margin-bottom: 15px;">Hello,</p>
                                  
                                  <p style="color: #555; margin-bottom: 15px;">We received a request to reset your password for your ${process.env.APP_NAME} account. If you didn't make this request, please ignore this email.</p>
                                  
                                  <p style="color: #555; margin-bottom: 15px;">To reset your password, click the button below. This link will expire in <strong>1 hour</strong>.</p>

                                  <!-- Reset Button -->
                                  <div style="text-align: center; margin: 30px 0;">
                                      <a href="${resetUrl}" 
                                         style="display: inline-block; padding: 15px 30px; background-color: #3498db; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; transition: background-color 0.3s;">
                                          Reset Your Password
                                      </a>
                                  </div>

                                  <p style="color: #555; margin-bottom: 15px;">For security reasons, this password reset link will expire in 1 hour. If you need to reset your password after that, please request a new reset link.</p>

                                  <!-- Security Notice -->
                                  <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                                      <p style="color: #666; margin: 0; font-size: 14px;">
                                          <strong>Security Tip:</strong> Make sure your new password is:
                                      </p>
                                      <ul style="color: #666; font-size: 14px; margin: 10px 0;">
                                          <li>At least 8 characters long</li>
                                          <li>Contains uppercase and lowercase letters</li>
                                          <li>Includes numbers and special characters</li>
                                          <li>Not used on other websites</li>
                                      </ul>
                                  </div>

                                  <!-- Alternative Link -->
                                  <p style="color: #555; margin: 20px 0; font-size: 14px;">
                                      If the button doesn't work, copy and paste this link into your browser:
                                      <br>
                                      <a href="${resetUrl}" style="color: #3498db; word-break: break-all;">${resetUrl}</a>
                                  </p>
                              </div>

                              <!-- Footer -->
                              <div style="border-top: 2px solid #eee; padding-top: 20px; margin-top: 20px; text-align: center;">
                                  <p style="color: #666; font-size: 14px; margin-bottom: 10px;">
                                      Need help? Contact our support team at 
                                      <a href="mailto:${process.env.EMAIL_TO}" style="color: #3498db; text-decoration: none;">
                                          ${process.env.EMAIL_TO}
                                      </a>
                                  </p>
                                  
                                  <div style="color: #666; font-size: 12px; margin-top: 20px;">
                                      <p style="margin: 5px 0;">
                                          &copy; ${new Date().getFullYear()} ${process.env.APP_NAME}. All rights reserved.
                                      </p>
                                      <p style="margin: 5px 0;">
                                          This is an automated message, please do not reply to this email.
                                      </p>
                                  </div>
                              </div>
                          </div>
                      </body>
                      </html>
                  `,
              },
          },
          Subject: {
              Charset: "UTF-8",
              Data: `Reset Your ${process.env.APP_NAME} Password`,
          },
      },
  };

  const command = new SendEmailCommand(params);
  try {
      const data = await client.send(command);
      return data;
  } catch (err) {
      console.error("SES Error:", err);
      throw err;
  }
};


// Updated sendContactEmailToAgent function
export const sendContactEmailToAgent = async (ad, user, message) => {
  const params = {
    Source: process.env.EMAIL_FROM,
    ReplyToAddresses: [user.email],
    Destination: {
      ToAddresses: [ad.postedBy.email],
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: `
            <html>
              <body>
                <p>Good day! ${ad.postedBy.name},</p>
                <p>You have received a new enquiry from ${user.name} via ${process.env.CLIENT_URL}.</p>
                <p><strong>Details:</strong></p>
                <ul>
                  <li>Name: ${user.name}</li>
                  <li>Email: <a href="mailto:${user.email}">${user.email}</a></li>
                  <li>Phone: ${user.phone}</li>
                  <li>Enquired Ad: <a href="${process.env.CLIENT_URL}/${ad.slug}">
                    ${ad.propertyType} for ${ad.action} - ${ad.address} - (${ad.price})
                  </a></li>
                </ul>
                <p><strong>Message:</strong></p>
                <p>${message}</p>
                <p>Thank you!</p>
                <i>Team ${process.env.APP_NAME}</i>
              </body>
            </html>
          `,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: `Enquiry received - ${process.env.APP_NAME}`,
      },
    },
  };

  const command = new SendEmailCommand(params);
  try {
    const data = await client.send(command);
    return data;
  } catch (err) {
    console.error("SES Error:", err);
    throw err;
  }
};
