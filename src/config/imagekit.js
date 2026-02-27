import ImageKit from "imagekit";
import dotenv from "dotenv";

dotenv.config();

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

export const uploadToImageKit = async (file, folder, fileName) => {
  try {
    const result = await imagekit.upload({
      file: file.buffer,
      fileName: fileName || `${Date.now()}-${file.originalname}`,
      folder: `/tabeiun-medicine/${folder}`,
      useUniqueFileName: true,
      tags: ["tabeiun", folder],
    });

    return {
      imageId: result.fileId,
      url: result.url,
      thumbnailUrl: result.thumbnailUrl,
    };
  } catch (error) {
    throw new Error(`ImageKit upload failed: ${error.message}`);
  }
};

export const deleteFromImageKit = async (fileId) => {
  try {
    await imagekit.deleteFile(fileId);
    return true;
  } catch (error) {
    throw new Error(`ImageKit delete failed: ${error.message}`);
  }
};

export const bulkDeleteFromImageKit = async (fileIds) => {
  try {
    await imagekit.bulkDeleteFiles(fileIds);
    return true;
  } catch (error) {
    throw new Error(`ImageKit bulk delete failed: ${error.message}`);
  }
};

export default imagekit;
