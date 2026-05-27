// require("dotenv").config();
import dotenv from "dotenv";
dotenv.config({
    path: "./env"
});
import express from "express";
import { connectToDatabase } from "./db/db.js";
const app = express();
connectToDatabase();



// (async () => {
//   try {
//     await mongoose.connect(process.env.MONGODB_URL, {
//       dbName: DB_NAME,
//     });
//     console.log("Connected to MongoDB");
//     app.on("error", (error) => {
//       console.error("Error starting the server:", error);
//     });
//     app.listen(process.env.PORT, () => {
//       console.log(`Server is running on port ${process.env.PORT}`);
//     });
//   } catch (error) {
//     console.error("Error connecting to MongoDB:", error);
//   }
// })();