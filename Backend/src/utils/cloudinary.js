import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs';
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = async (filePath, folder) => {
    try{
    const response = await cloudinary.uploader.upload(filePath, {
        resource_type: "auto",
    })
    //console.log("file is uploaded to cloudinary", response.url);
    fs.unlinkSync(filePath);
    return response;
    }catch(error){
        fs.unlinkSync(filePath);
        return null;
    }
}
export default uploadToCloudinary;