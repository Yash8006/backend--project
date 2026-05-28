// require("dotenv").config();
import dotenv from "dotenv";
import app from "./app.js";
dotenv.config({
    path: "./env"
});
import express from "express";
import { connectToDatabase } from "./db/db.js";

connectToDatabase().then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running on port ${process.env.PORT || 8000}`);
    });
    
}).catch((error) => {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1); // Exit the process with an error code
});



