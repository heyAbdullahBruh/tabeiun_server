import { v4 as uuidv4 } from "uuid";
import dayjs from "dayjs";

export const generateOrderId = () => {
  const date = dayjs().format("YYYYMMDD");
  const uniqueId = uuidv4().split("-")[0].toUpperCase();
  return `ORD-${date}-${uniqueId}`;
};

export const generateInvoiceId = (orderId, sequence) => {
  return `INV-${orderId}-${sequence.toString().padStart(3, "0")}`;
};
