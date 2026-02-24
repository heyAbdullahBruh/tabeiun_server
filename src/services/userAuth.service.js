import { User } from "../models/user.model.js";

export const socialLoginService = async (profile) => {
  const { email, name, provider, providerId } = profile;

  let user = await User.findOne({
    $or: [{ providerId }, { email }],
  });

  if (!user) {
    user = await User.create({
      name,
      email,
      provider,
      providerId,
      role: "USER",
    });
  }

  return user;
};
