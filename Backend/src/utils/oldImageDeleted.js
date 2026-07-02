import { v2 as cloudinary } from "cloudinary";

/**
 * Deletes an old image from Cloudinary using its URL.
 * Extracts the public_id from a Cloudinary URL and destroys the asset.
 *
 * @param {string} imageUrl - The full Cloudinary URL of the image to delete
 *   e.g. "https://res.cloudinary.com/demo/image/upload/v1234567890/abc123.jpg"
 */
const oldImageDeleted = async (imageUrl) => {
    if (!imageUrl) return;

    try {
        // Extract the public_id from the Cloudinary URL
        // A typical URL looks like:
        //   https://res.cloudinary.com/<cloud>/image/upload/v<version>/<public_id>.<ext>
        // We need the <public_id> part (without the extension)
        const urlParts = imageUrl.split("/");
        const fileWithExtension = urlParts[urlParts.length - 1]; // e.g. "abc123.jpg"
        const publicId = fileWithExtension.split(".")[0]; // e.g. "abc123"

        const result = await cloudinary.uploader.destroy(publicId);
        console.log(`Old image deleted from Cloudinary: ${publicId}`, result);
    } catch (error) {
        console.error("Failed to delete old image from Cloudinary:", error);
        // Don't throw — deletion failure shouldn't break the update flow
    }
};

export default oldImageDeleted;
