import imageKit from "../config/imagekit.js";

export const uploadToImageKit = async (fileBuffer, fileName) => {
  try {
    const response = await imageKit.upload({
      file: fileBuffer, // buffer
      fileName: fileName,
      folder: "/tabeiun-products",
    });
    return { imageId: response.fileId, url: response.url };
  } catch (error) {
    throw new Error("Image Upload Failed: " + error.message);
  }
};

export const deleteFromImageKit = async (fileId) => {
  try {
    await imageKit.deleteFile(fileId);
  } catch (error) {
    console.error("Image Deletion Failed", error);
  }
};
