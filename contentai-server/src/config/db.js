import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI ||
  "mongodb+srv://abhinavsabu22_db_user:WabcAQHgjArbS6nl@cluster1.os5huy9.mongodb.net/contentai?appName=Cluster1";

let isConnected = false;

export async function connectDB() {
  if (isConnected) return;
  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: "contentai",
    });
    isConnected = true;
    console.log("  ✅ MongoDB connected");
  } catch (err) {
    console.error("  ❌ MongoDB connection failed:", err.message);
    process.exit(1);
  }
}

export default mongoose;
