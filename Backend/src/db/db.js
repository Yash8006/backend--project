import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

export const connectToDatabase = async () => {
  try {
    const connection = await mongoose.connect(process.env.MONGODB_URL, {
      dbName: DB_NAME,
    });
    console.log(`Connected to MongoDB at ${connection.connection.host}`);
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1); // Exit the process with an error code
  }
};  
export default connectToDatabase;