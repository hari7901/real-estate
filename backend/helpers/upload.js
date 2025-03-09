import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { nanoid } from 'nanoid';
import sharp from 'sharp';

const client = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  region: process.env.AWS_REGION,
});

const resizeImage = async (buffer) => {
  try {
    return await sharp(buffer)
      .resize(1600, 900, { fit: 'inside', withoutEnlargement: true })
      .toBuffer();
  } catch (err) {
    console.error("Error during image resize:", err);
    throw err;
  }
};

const uploadToS3 = async (buffer, mimetype, uploadedBy) => {
  try {
    if (!process.env.AWS_BUCKET_NAME) {
      throw new Error("AWS_BUCKET_NAME is not defined in environment variables.");
    }
    const metadata = await sharp(buffer).metadata();
    const fileExtension = metadata.format || "jpg";
    const Key = `${nanoid()}.${fileExtension}`;
    const Location = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${Key}`;

    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key,
      Body: buffer,
      ContentType: mimetype,
      Metadata: { uploadedBy },
    };

    console.log("Uploading to S3 with params:", params);
    const command = new PutObjectCommand(params);
    await client.send(command);

    return { Key, Location, uploadedBy };
  } catch (err) {
    console.error("Upload to S3 error =>", err);
    throw new Error("Upload to S3 failed");
  }
};

export const uploadImageToS3 = async (files, uploadedBy) => {
  const uploadPromises = files.map(async (file) => {
    const resizedBuffer = await resizeImage(file.buffer);
    return uploadToS3(resizedBuffer, file.mimetype, uploadedBy);
  });
  return Promise.all(uploadPromises);
};

export const deleteImageFromS3 = async (Key) => {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key,
  };
  try {
    const command = new DeleteObjectCommand(params);
    await client.send(command);
  } catch (err) {
    console.error("Delete from S3 error =>", err);
    throw new Error("Delete from S3 failed");
  }
};
