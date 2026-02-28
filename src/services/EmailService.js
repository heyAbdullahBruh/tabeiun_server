import { sendEmail } from "../config/nodemailer.js";
import { emailTemplates } from "../emails/templates.js";
import dotenv from "dotenv";

dotenv.config();

class EmailService {
  async sendWelcomeEmail(user) {
    try {
      const html = emailTemplates.welcome(user);
      await sendEmail({
        to: user.email,
        subject: "স্বাগতম তাবেইউন মেডিসিনে",
        html,
      });
    } catch (error) {
      console.error("Welcome email failed:", error);
    }
  }

  async sendOrderConfirmationToCustomer(order, user) {
    try {
      const html = emailTemplates.orderConfirmationCustomer(order, user);
      await sendEmail({
        to: user.email,
        subject: `অর্ডার কনফার্মেশন - ${order.orderId}`,
        html,
      });
    } catch (error) {
      console.error("Order confirmation email to customer failed:", error);
    }
  }

  async sendOrderConfirmationToAdmin(order, user) {
    try {
      const html = emailTemplates.orderConfirmationAdmin(order, user);
      await sendEmail({
        to: process.env.ADMIN_EMAIL,
        subject: `নতুন অর্ডার - ${order.orderId}`,
        html,
      });
    } catch (error) {
      console.error("Order confirmation email to admin failed:", error);
    }
  }

  async sendOrderStatusUpdate(order, user, status) {
    try {
      const html = emailTemplates.orderStatusUpdate(order, user, status);
      await sendEmail({
        to: user.email,
        subject: `অর্ডার স্ট্যাটাস আপডেট - ${order.orderId}`,
        html,
      });
    } catch (error) {
      console.error("Order status update email failed:", error);
    }
  }

  async sendProductNotificationToAdmin(product, action) {
    try {
      const html = emailTemplates.productNotification(product, action);
      await sendEmail({
        to: process.env.ADMIN_EMAIL,
        subject: `পণ্য ${action} - ${product.name}`,
        html,
      });
    } catch (error) {
      console.error("Product notification email failed:", error);
    }
  }

  async sendLowStockAlert(product) {
    try {
      const html = emailTemplates.lowStockAlert(product);
      await sendEmail({
        to: process.env.ADMIN_EMAIL,
        subject: `⚠️ কম স্টক সতর্কতা - ${product.name}`,
        html,
      });
    } catch (error) {
      console.error("Low stock alert email failed:", error);
    }
  }
}

export default new EmailService();
