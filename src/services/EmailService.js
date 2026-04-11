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

  // Add these methods to existing EmailService class

  async sendPasswordResetEmail(admin, resetUrl) {
    try {
      const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2ecc71, #27ae60); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #2ecc71; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
          .button:hover { background: #27ae60; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>পাসওয়ার্ড রিসেট</h1>
            <h1>Password Reset</h1>
          </div>
          <div class="content">
            <h2>প্রিয় ${admin.name},</h2>
            <h2>Dear ${admin.name},</h2>
            
            <p>আমরা আপনার পাসওয়ার্ড রিসেট করার জন্য একটি অনুরোধ পেয়েছি। নিচের বাটনে ক্লিক করে নতুন পাসওয়ার্ড সেট করুন।</p>
            <p>We received a request to reset your password. Click the button below to set a new password.</p>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password / পাসওয়ার্ড রিসেট</a>
            </div>
            
            <div class="warning">
              <strong>⚠️ Important / গুরুত্বপূর্ণ:</strong>
              <p>This link will expire in 1 hour. If you didn't request this, please ignore this email and your password will remain unchanged.</p>
              <p>এই লিংকটি ১ ঘন্টার মধ্যে মেয়াদ শেষ হয়ে যাবে। যদি আপনি এই অনুরোধ না করে থাকেন, তাহলে এই ইমেইলটি ইগনোর করুন এবং আপনার পাসওয়ার্ড অপরিবর্তিত থাকবে।</p>
            </div>
            
            <p>Or copy this link: <br> ${resetUrl}</p>
            
            <p>Thanks,<br>Tabeiun Medicine Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Tabeiun Medicine. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

      await sendEmail({
        to: admin.email,
        subject: "Password Reset Request - Tabeiun Medicine",
        html,
      });
    } catch (error) {
      console.error("Password reset email failed:", error);
    }
  }

  async sendPasswordResetConfirmationEmail(admin) {
    try {
      const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2ecc71, #27ae60); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px; }
          .checkmark { font-size: 60px; text-align: center; color: #2ecc71; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Successful</h1>
            <h1>পাসওয়ার্ড রিসেট সফল</h1>
          </div>
          <div class="content">
            <div class="checkmark">✓</div>
            <p>Dear ${admin.name},</p>
            <p>Your password has been successfully reset. You can now login with your new password.</p>
            
            <p>প্রিয় ${admin.name},</p>
            <p>আপনার পাসওয়ার্ড সফলভাবে রিসেট করা হয়েছে। আপনি এখন আপনার নতুন পাসওয়ার্ড দিয়ে লগইন করতে পারবেন।</p>
            
            <p>If you didn't perform this action, please contact support immediately.</p>
            <p>যদি আপনি এই কাজটি না করে থাকেন, তাহলে অবিলম্বে সাপোর্টে যোগাযোগ করুন।</p>
            
            <p>Thanks,<br>Tabeiun Medicine Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Tabeiun Medicine. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

      await sendEmail({
        to: admin.email,
        subject: "Password Reset Confirmation - Tabeiun Medicine",
        html,
      });
    } catch (error) {
      console.error("Password reset confirmation email failed:", error);
    }
  }

  async sendEmailVerificationCode(user, verificationCode) {
    try {
      const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2ecc71, #27ae60); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px; text-align: center; }
          .code { font-size: 48px; font-weight: bold; letter-spacing: 10px; background: #fff; padding: 20px; border-radius: 10px; margin: 20px 0; font-family: monospace; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Email Verification</h1>
            <h1>ইমেইল ভেরিফিকেশন</h1>
          </div>
          <div class="content">
            <h2>Dear ${user.name},</h2>
            <h2>প্রিয় ${user.name},</h2>
            <p>Your email verification code is:</p>
            <div class="code">${verificationCode}</div>
            <p>This code will expire in <strong>10 minutes</strong>.</p>
            <p>Thanks,<br>Tabeiun Medicine Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Tabeiun Medicine. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

      await sendEmail({
        to: user.email,
        subject: "Verify Your Email - Tabeiun Medicine",
        html,
      });
    } catch (error) {
      console.error("Email verification code failed:", error);
    }
  }

  async sendEmailVerificationSuccess(user) {
    try {
      const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2ecc71, #27ae60); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px; text-align: center; }
          .checkmark { font-size: 60px; color: #2ecc71; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Email Verified Successfully!</h1>
          </div>
          <div class="content">
            <div class="checkmark">✓</div>
            <h2>Dear ${user.name},</h2>
            <p>Your email has been successfully verified. You can now access all features.</p>
            <p>Thanks,<br>Tabeiun Medicine Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Tabeiun Medicine. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

      await sendEmail({
        to: user.email,
        subject: "Email Verified Successfully - Tabeiun Medicine",
        html,
      });
    } catch (error) {
      console.error("Email verification success email failed:", error);
    }
  }

  async sendPasswordResetCodeEmail(user, resetCode) {
    try {
      const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f39c12, #e67e22); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px; text-align: center; }
          .code { font-size: 48px; font-weight: bold; letter-spacing: 10px; background: #fff; padding: 20px; border-radius: 10px; margin: 20px 0; font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Code</h1>
          </div>
          <div class="content">
            <h2>Dear ${user.name},</h2>
            <p>Your password reset code is:</p>
            <div class="code">${resetCode}</div>
            <p>This code will expire in <strong>10 minutes</strong>.</p>
            <p>Thanks,<br>Tabeiun Medicine Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Tabeiun Medicine. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

      await sendEmail({
        to: user.email,
        subject: "Password Reset Code - Tabeiun Medicine",
        html,
      });
    } catch (error) {
      console.error("Password reset code email failed:", error);
    }
  }

  async sendPasswordResetConfirmationEmail(user) {
    try {
      const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2ecc71, #27ae60); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px; text-align: center; }
          .checkmark { font-size: 60px; color: #2ecc71; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Successful</h1>
          </div>
          <div class="content">
            <div class="checkmark">✓</div>
            <h2>Dear ${user.name},</h2>
            <p>Your password has been successfully reset. You can now login with your new password.</p>
            <p>Thanks,<br>Tabeiun Medicine Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Tabeiun Medicine. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

      await sendEmail({
        to: user.email,
        subject: "Password Reset Successful - Tabeiun Medicine",
        html,
      });
    } catch (error) {
      console.error("Password reset confirmation email failed:", error);
    }
  }

  async sendPasswordChangeConfirmationEmail(user) {
    try {
      const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2ecc71, #27ae60); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px; text-align: center; }
          .checkmark { font-size: 60px; color: #2ecc71; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Changed Successfully</h1>
          </div>
          <div class="content">
            <div class="checkmark">✓</div>
            <h2>Dear ${user.name},</h2>
            <p>Your password has been successfully changed. If you did not perform this action, please contact support immediately.</p>
            <p>Thanks,<br>Tabeiun Medicine Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Tabeiun Medicine. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

      await sendEmail({
        to: user.email,
        subject: "Password Changed - Tabeiun Medicine",
        html,
      });
    } catch (error) {
      console.error("Password change confirmation email failed:", error);
    }
  }
}

export default new EmailService();
