# তাবেইউন মেডিসিন - Backend API

Production-ready, scalable backend API for Bangla Language Herbal Medicine E-Commerce Platform.

## 🚀 Features

- **Dual Authentication System**: Separate auth for Admin Dashboard and Public Website
- **Role-Based Access Control**: Admin and Moderator roles with specific permissions
- **Advanced Product Filtering**: Multi-criteria search and filtering
- **Order Management**: Complete order lifecycle with stock management
- **Review System**: Verified buyer-only reviews with image upload
- **Analytics Dashboard**: Comprehensive sales and performance metrics
- **Email Notifications**: Automated emails for orders, status updates, and alerts
- **Image Management**: ImageKit integration for optimized image handling
- **Security**: JWT, rate limiting, XSS protection, MongoDB sanitization
- **Bangla Language Support**: Full UTF-8 support with Bangla slug generation

## 🛠 Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT, Google OAuth, Facebook OAuth
- **File Upload**: ImageKit
- **Email**: Nodemailer
- **Security**: Helmet, CORS, Rate Limiting, XSS Clean
- **Validation**: express-validator
- **Pagination**: mongoose-paginate-v2

## 📁 Project Structure
src/
├── config/ # Configuration files
├── controllers/ # Route controllers
├── services/ # Business logic
├── models/ # Database models
├── routes/ # API routes
├── middlewares/ # Custom middlewares
├── validators/ # Request validators
├── utils/ # Utility functions
├── emails/ # Email templates
├── constants/ # Constants and enums
├── app.js # Express app
└── server.js # Server entry point

## 🚦 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB
- ImageKit account
- Google OAuth credentials
- Facebook OAuth credentials

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
3. Copy .env.example to .env and fill in your values
4. Start the server:
    ```bash
        npm run dev     # Development
        npm start       # Production
## 📚 API Documentation