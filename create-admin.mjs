import { config } from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

config({ path: '.env.local' });

// Sederhanakan Mongoose schema untuk script CLI
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, required: true }
});
const User = mongoose.models.User || mongoose.model('User', userSchema);

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Terhubung ke MongoDB...');

    const existingAdmin = await User.findOne({ username: 'admin' });
    if (existingAdmin) {
      console.log('Akun admin sudah ada. Username: admin');
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('admin123', salt);

    await User.create({
      username: 'admin',
      passwordHash,
      name: 'Administrator Utama',
      role: 'admin'
    });

    console.log('Akun admin berhasil dibuat!');
    console.log('Username: admin');
    console.log('Password: admin123');
    
  } catch (error) {
    console.error('Terjadi kesalahan:', error);
  } finally {
    process.exit(0);
  }
}

createAdmin();
