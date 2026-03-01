export const emailTemplates = {
  welcome: (user) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'SolaimanLipi', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2ecc71; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px 20px; background: #f9f9f9; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .button { background: #2ecc71; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>তাবেইউন মেডিসিনে স্বাগতম</h1>
        </div>
        <div class="content">
          <h2>প্রিয় ${user.name},</h2>
          <p>তাবেইউন মেডিসিনে আপনাকে স্বাগতম। আপনার অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে।</p>
          <p>এখন আপনি আমাদের সব প্রোডাক্ট দেখতে এবং অর্ডার করতে পারবেন।</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.PUBLIC_URL}" class="button">শপিং শুরু করুন</a>
          </div>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} তাবেইউন মেডিসিন। সকল অধিকার সংরক্ষিত।</p>
        </div>
      </div>
    </body>
    </html>
  `,

  orderConfirmationCustomer: (order, user) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'SolaimanLipi', Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .order-details { background: #f5f5f5; padding: 20px; border-radius: 8px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>অর্ডার কনফার্মেশন</h2>
        <p>প্রিয় ${user.name}, আপনার অর্ডারটি সফলভাবে সম্পন্ন হয়েছে।</p>
        
        <div class="order-details">
          <h3>অর্ডার তথ্য</h3>
          <p><strong>অর্ডার আইডি:</strong> ${order.orderId}</p>
          <p><strong>অর্ডারের তারিখ:</strong> ${new Date(order.createdAt).toLocaleDateString("bn-BD")}</p>
          
          <h3>প্রোডাক্ট সমূহ</h3>
          <table>
            <thead>
              <tr>
                <th>প্রোডাক্ট</th>
                <th>পরিমাণ</th>
                <th>মূল্য</th>
              </tr>
            </thead>
            <tbody>
              ${order.products
                .map(
                  (item) => `
                <tr>
                  <td>${item.product.name}</td>
                  <td>${item.quantity}</td>
                  <td>৳${item.priceAtPurchase}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2"><strong>মোট</strong></td>
                <td><strong>৳${order.finalAmount}</strong></td>
              </tr>
            </tfoot>
          </table>
          
          <h3>ডেলিভারি ঠিকানা</h3>
          <p>${order.deliveryAddress.street}, ${order.deliveryAddress.city}</p>
          <p>ফোন: ${order.phone}</p>
        </div>
        
        <p>অর্ডার স্ট্যাটাস ট্র্যাক করতে আপনার ড্যাশবোর্ড ভিজিট করুন।</p>
      </div>
    </body>
    </html>
  `,

  orderConfirmationAdmin: (order, user) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
    </head>
    <body>
      <h2>নতুন অর্ডার এসেছে</h2>
      <p><strong>অর্ডার আইডি:</strong> ${order.orderId}</p>
      <p><strong>গ্রাহক:</strong> ${user.name}</p>
      <p><strong>ইমেইল:</strong> ${user.email}</p>
      <p><strong>ফোন:</strong> ${order.phone}</p>
      <p><strong>মোট মূল্য:</strong> ৳${order.finalAmount}</p>
      <p><strong>অর্ডারের সময়:</strong> ${new Date(order.createdAt).toLocaleString("bn-BD")}</p>
      
      <h3>প্রোডাক্ট সমূহ:</h3>
      <ul>
        ${order.products
          .map(
            (item) => `
          <li>${item.product.name} - ${item.quantity} x ৳${item.priceAtPurchase}</li>
        `,
          )
          .join("")}
      </ul>
    </body>
    </html>
  `,

  orderStatusUpdate: (order, user, status) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
    </head>
    <body>
      <h2>অর্ডার স্ট্যাটাস আপডেট</h2>
      <p>প্রিয় ${user.name},</p>
      <p>আপনার অর্ডার #${order.orderId} এর স্ট্যাটাস পরিবর্তন হয়েছে।</p>
      
      <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
        <p><strong>নতুন স্ট্যাটাস:</strong> ${this.getStatusBangla(status)}</p>
        <p><strong>তারিখ:</strong> ${new Date().toLocaleDateString("bn-BD")}</p>
      </div>
      
      <p>বিস্তারিত জানতে আপনার অ্যাকাউন্টে লগইন করুন।</p>
    </body>
    </html>
  `,

  lowStockAlert: (product) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
    </head>
    <body>
      <h2>⚠️ কম স্টক সতর্কতা</h2>
      <p><strong>প্রোডাক্ট:</strong> ${product.name}</p>
      <p><strong>বর্তমান স্টক:</strong> ${product.stock}</p>
      <p><strong>সতর্কতা লিমিট:</strong> ${product.lowStockAlert}</p>
      <p><a href="${process.env.DASHBOARD_URL}/products/${product._id}">প্রোডাক্ট দেখুন</a></p>
    </body>
    </html>
  `,

  getStatusBangla: (status) => {
    const statusMap = {
      Pending: "অপেক্ষমান",
      Confirmed: "নিশ্চিতকৃত",
      Processing: "প্রক্রিয়াধীন",
      Shipped: "পাঠানো হয়েছে",
      Delivered: "ডেলিভারি সম্পন্ন",
      Cancelled: "বাতিল করা হয়েছে",
    };
    return statusMap[status] || status;
  },

  productNotification: (product, action) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
    </head>
    <body>
      <h2>প্রোডাক্ট ${action === "created" ? "তৈরি" : "হালনাগাদ"} হয়েছে</h2>
      <p><strong>প্রোডাক্ট:</strong> ${product.name}</p>
      <p><strong>মূল্য:</strong> ৳${product.price}</p>
      <p><strong>স্টক:</strong> ${product.stock}</p>
      <p><a href="${process.env.DASHBOARD_URL}/products/${product._id}">প্রোডাক্ট দেখুন</a></p>
    </body>
    </html>
  `,
};
