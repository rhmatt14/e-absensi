import { config } from 'dotenv';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';

config({ path: '.env.local' });

async function test() {
  console.log('Testing MongoDB connection...');
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully!');
  } catch (error) {
    console.error('MongoDB connection error:', error);
  }

  console.log('\nTesting Cloudinary configuration...');
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  
  console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
  
  try {
    const result = await cloudinary.api.ping();
    console.log('Cloudinary ping success:', result);
  } catch (error) {
    console.error('Cloudinary ping error:', error);
  }
  
  process.exit(0);
}

test();
