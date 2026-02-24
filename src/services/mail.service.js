import { sendMail } from "../config/mailer.js";

const generateOrderTable = (products) => {
  return products
    .map(
      (item) => `
    <tr>
      <td>${item.product.name}</td>
      <td>${item.quantity}</td>
      <td>${item.priceAtPurchase} BDT</td>
    </tr>
  `,
    )
    .join("");
};

export const sendOrderEmail = async (order, user, type = "NEW_ORDER") => {
  const subjectMap = {
    NEW_ORDER: "আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে",
    CONFIRMED: "আপনার অর্ডারটি নিশ্চিত করা হয়েছে",
    SHIPPED: "আপনার অর্ডারটি ডেলিভারির জন্য পাঠানো হয়েছে",
    CANCELLED: "আপনার অর্ডারটি বাতিল করা হয়েছে",
  };

  const html = `
    <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
      <h2>Tabeiun Herbal Medicine</h2>
      <p>প্রিয় ${user.name},</p>
      <p>${subjectMap[type]}</p>
      <p>অর্ডার আইডি: <b>#${order.orderId}</b></p>
      <table border="1" style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th>পণ্য</th>
            <th>পরিমাণ</th>
            <th>মূল্য</th>
          </tr>
        </thead>
        <tbody>
          ${generateOrderTable(order.products)}
        </tbody>
      </table>
      <p>মোট মূল্য: ${order.finalAmount} BDT</p>
      <p>ডেলিভারি ঠিকানা: ${order.deliveryAddress}</p>
    </div>
  `;

  await sendMail(user.email, subjectMap[type], html);
};
