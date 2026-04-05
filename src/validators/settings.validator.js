import { body } from "express-validator";

export const notificationPreferencesValidator = [
  body("email")
    .optional()
    .isObject()
    .withMessage("Email preferences must be an object"),
  body("email.orderNotifications")
    .optional()
    .isBoolean()
    .withMessage("Order notifications must be boolean"),
  body("email.newUserAlerts")
    .optional()
    .isBoolean()
    .withMessage("New user alerts must be boolean"),
  body("email.lowStockAlerts")
    .optional()
    .isBoolean()
    .withMessage("Low stock alerts must be boolean"),
  body("email.dailySummary")
    .optional()
    .isBoolean()
    .withMessage("Daily summary must be boolean"),
  body("email.weeklyReport")
    .optional()
    .isBoolean()
    .withMessage("Weekly report must be boolean"),
  body("email.systemUpdates")
    .optional()
    .isBoolean()
    .withMessage("System updates must be boolean"),
  body("inApp")
    .optional()
    .isObject()
    .withMessage("In-app preferences must be an object"),
  body("inApp.realTimeOrders")
    .optional()
    .isBoolean()
    .withMessage("Real-time orders must be boolean"),
  body("inApp.mentionNotifications")
    .optional()
    .isBoolean()
    .withMessage("Mention notifications must be boolean"),
  body("desktop")
    .optional()
    .isObject()
    .withMessage("Desktop preferences must be an object"),
  body("desktop.enabled")
    .optional()
    .isBoolean()
    .withMessage("Desktop enabled must be boolean"),
  body("desktop.soundAlerts")
    .optional()
    .isBoolean()
    .withMessage("Sound alerts must be boolean"),
  body("desktop.quietHours")
    .optional()
    .isObject()
    .withMessage("Quiet hours must be an object"),
  body("desktop.quietHours.enabled")
    .optional()
    .isBoolean()
    .withMessage("Quiet hours enabled must be boolean"),
  body("desktop.quietHours.start")
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Invalid time format (HH:MM)"),
  body("desktop.quietHours.end")
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Invalid time format (HH:MM)"),
];

export const userPreferencesValidator = [
  body("theme")
    .optional()
    .isIn(["light", "dark", "system"])
    .withMessage("Theme must be light, dark, or system"),
  body("language")
    .optional()
    .isIn(["en", "bn"])
    .withMessage("Language must be en or bn"),
  body("dateFormat")
    .optional()
    .isString()
    .withMessage("Date format must be a string"),
  body("timeFormat")
    .optional()
    .isIn(["12h", "24h"])
    .withMessage("Time format must be 12h or 24h"),
  body("currency")
    .optional()
    .isIn(["BDT", "USD"])
    .withMessage("Currency must be BDT or USD"),
  body("dashboard.defaultView")
    .optional()
    .isString()
    .withMessage("Default view must be a string"),
  body("dashboard.autoRefresh")
    .optional()
    .isBoolean()
    .withMessage("Auto refresh must be boolean"),
  body("dashboard.refreshInterval")
    .optional()
    .isInt({ min: 10, max: 300 })
    .withMessage("Refresh interval must be between 10 and 300 seconds"),
  body("accessibility.fontSize")
    .optional()
    .isIn(["small", "medium", "large", "x-large"])
    .withMessage("Invalid font size"),
  body("accessibility.highContrast")
    .optional()
    .isBoolean()
    .withMessage("High contrast must be boolean"),
  body("accessibility.reducedMotion")
    .optional()
    .isBoolean()
    .withMessage("Reduced motion must be boolean"),
  body("tableSettings.defaultPageSize")
    .optional()
    .isInt({ min: 5, max: 100 })
    .withMessage("Page size must be between 5 and 100"),
  body("tableSettings.denseView")
    .optional()
    .isBoolean()
    .withMessage("Dense view must be boolean"),
];
