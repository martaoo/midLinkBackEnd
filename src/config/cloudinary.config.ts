// cloudinary.config.ts
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import * as dotenv from 'dotenv'; // 1. Import dotenv

dotenv.config(); // 2. Load the .env file IMMEDIATELY

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

export const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: 'referrals',
      resource_type: 'auto',
      public_id: `med-${Date.now()}-${Math.round(Math.random() * 1e9)}`,
    };
  },
});