"use strict";

// ============================
// 1. IMPORTS AND CONFIGURATION
// ============================
const { Telegraf, Markup, Scenes, session } = require("telegraf");
const mongoose = require("mongoose");
const crypto = require("crypto");
const fs = require("fs").promises;
const path = require("path");

// Environment variables
require("dotenv").config();

// Configuration
const CONFIG = {
  // Bot Configuration
  BOT_TOKEN:
    process.env.BOT_TOKEN || "8257725385:AAFCnlBveQjk8OplTtQe3kLwjlKlLXxXzlQ",

  // MongoDB Configuration
  MONGODB_URI:
    process.env.MONGODB_URI ||
    "mongodb+srv://tohirjonovhadyatillo_db_user:wnSyG3Ud5EomghS1@cluster0.dpjguhn.mongodb.net/senator_bot?retryWrites=true&w=majority",
  MONGODB_OPTIONS: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000,
    maxPoolSize: 10,
    minPoolSize: 1,
  },

  // Admin Configuration
  ADMIN_IDS: process.env.ADMIN_IDS
    ? process.env.ADMIN_IDS.split(",").map((id) => parseInt(id.trim()))
    : [6873603981, 296801391],

  // YANGILANGAN: Majburiy obuna kanallari (faqat public kanallar)
  REQUIRED_CHANNELS: [
    {
      id: "@SENATOR_PUBGM",
      name: "SENATOR PUBGM",
      url: "https://t.me/SENATOR_PUBGM",
      type: "public",
      username: "@SENATOR_PUBGM",
    },
    {
      id: "@DangerEsportsFamily",
      name: "Danger Esports Family",
      url: "https://t.me/DangerEsportsFamily",
      type: "public",
      username: "@DangerEsportsFamily",
    },
    {
      id: "@DangerEsports_market",
      name: "Danger Esports",
      url: "https://t.me/DangerEsports_Market",
      type: "public",
      username: "@DangerEsports_market",
    },
    {
      id: "@senatorkuponchik",
      name: "Senator Kuponchik",
      url: "https://t.me/senatorkuponchik",
      type: "public",
      username: "@senatorkuponchik",
    },
    {
      id: "@SENATORKUPON",
      name: "SENATOR KUPON",
      url: "https://t.me/SENATORKUPON",
      type: "public",
      username: "@SENATORKUPON",
    },
    {
      id: "@senatorazart",
      name: "SENATOR 19+",
      url: "https://t.me/senatorazart",
      type: "public",
      username: "@senatorazart",
    },
    {
      id: "@senatorlive",
      name: "SENATOR LIVE",
      url: "https://t.me/SENATORLIVE",
      type: "public",
      username: "@senatorlive",
    },
    {
      id: "@senator_efir",
      name: "SENATOR EFIR",
      url: "https://t.me/SENATOR_EFIR",
      type: "public",
      username: "@senator_efir",
    },
        {
      id: "@senatorfutbol",
      name: "SENATOR FUTBOL",
      url: "https://t.me/SENATORFUTBOL",
      type: "public",
      username: "@senatorfutbol",
    },
  ],

  // Contest Configuration
  CONTESTS: {
    IPHONE: {
      name: "iPhone 17 Pro Max",
      prize_count: 5,
      site_url:
        "https://qbaff.com/L?tag=s_4361464m_94905c_&site=4361464&ad=94905&r=uz/registration",
      promo_code: "SENATOR",
      id_pattern: /^153\d{3,12}$/,
      id_min_length: 6,
      id_max_length: 15,
      description: "5 ta iPhone 17 Pro Max telefon sovg'a qilinadi!",
      rules: [
        "Saytga ro'yxatdan o'ting",
        "Promokod: SENATOR",
        "ID raqamingizni oling",
      ],
      button_text: "📱 iPhone 17 Pro Max",
      emoji: "📱",
    },
    REDMI: {
      name: "Redmi Smartphone",
      prize_count: 10,
      site_url: "https://xparisport.com/?promocode=senator",
      promo_code: "SENATOR",
      id_pattern: /^150\d{3,12}$/,
      id_min_length: 6,
      id_max_length: 15,
      description: "10 ta Redmi telefon sovg'a qilinadi!",
      rules: [
        "Saytga ro'yxatdan o'ting",
        "Promokod: SENATOR",
        "ID raqamingizni oling",
      ],
      button_text: "📱 Redmi",
      emoji: "📱",
    },
    GENTRA: {
      name: "Chevrolet Gentra",
      prize_count: 1,
      site_url:
        "https://qbaff.com/L?tag=s_4361464m_94905c_&site=4361464&ad=94905&r=uz/registration",
      promo_code: "SENATOR",
      id_pattern: /^153\d{3,12}$/, // YANGILANDI: Gentra ham 150 bilan boshlanishi kerak
      id_min_length: 6,
      id_max_length: 15,
      description: "1 ta Chevrolet Gentra avtomobil sovg'a qilinadi!",
      rules: [
        "Saytga ro'yxatdan o'ting",
        "Promokod: SENATOR",
        "Avtomobil uchun ariza to'ldiring",
        "ID raqamingizni oling",
      ],
      button_text: "🚗 Chevrolet Gentra",
      emoji: "🚗",
    },
  },

  // Bot Behavior Configuration
  SETTINGS: {
    subscription_check_interval: 300000, // 5 daqiqa
    max_retries: 3,
    request_timeout: 10000,
    cache_duration: 300000, // 5 minutes
    max_users_per_day: 1000,
    max_requests_per_minute: 20,
    maintenance_mode: false,
    debug_mode: process.env.NODE_ENV === "development",
    broadcast_batch_size: 15,
    broadcast_delay: 1500,
  },

  // File Paths
  PATHS: {
    logs: "./logs",
    backups: "./backups",
    temp: "./temp",
  },
};

// ============================
// 2. DATABASE MODELS
// ============================
const userSchema = new mongoose.Schema(
  {
    userId: { type: Number, required: true, unique: true, index: true },
    telegramId: { type: Number, required: true, unique: true },
    username: { type: String, index: true, sparse: true },
    firstName: String,
    lastName: String,
    languageCode: String,

    subscribedChannels: [
      {
        channelId: String,
        channelName: String,
        subscribedAt: Date,
        isAdmin: { type: Boolean, default: false },
      },
    ],
    isSubscribed: { type: Boolean, default: false, index: true },
    subscriptionCheckedAt: Date,

    contests: {
      iphone: {
        participated: { type: Boolean, default: false },
        participantId: { type: String, sparse: true },
        participationDate: Date,
        verified: { type: Boolean, default: false },
        verificationDate: Date,
      },
      redmi: {
        participated: { type: Boolean, default: false },
        participantId: { type: String, sparse: true },
        participationDate: Date,
        verified: { type: Boolean, default: false },
        verificationDate: Date,
      },
      gentra: {
        participated: { type: Boolean, default: false },
        participantId: { type: String, sparse: true },
        participationDate: Date,
        verified: { type: Boolean, default: false },
        verificationDate: Date,
      },
    },

    participationCount: { type: Number, default: 0 },
    lastActivity: Date,

    ipAddress: String,
    userAgent: String,
    isBlocked: { type: Boolean, default: false },
    blockReason: String,
    isActive: { type: Boolean, default: true, index: true },

    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

userSchema.virtual("fullName").get(function () {
  return `${this.firstName || ""} ${this.lastName || ""}`.trim();
});

userSchema.virtual("hasParticipatedIphone").get(function () {
  return this.contests?.iphone?.participated || false;
});

userSchema.virtual("hasParticipatedRedmi").get(function () {
  return this.contests?.redmi?.participated || false;
});

userSchema.virtual("hasParticipatedGentra").get(function () {
  return this.contests?.gentra?.participated || false;
});

const User = mongoose.model("User", userSchema);

const winnerSchema = new mongoose.Schema(
  {
    contestType: {
      type: String,
      enum: ["iphone", "redmi", "gentra"],
      required: true,
      index: true,
    },
    userId: { type: Number, required: true, index: true },
    userInfo: {
      telegramId: Number,
      username: String,
      firstName: String,
      lastName: String,
    },

    participantId: { type: String, required: true },
    prizeNumber: { type: Number, required: true },

    selectedBy: {
      adminId: Number,
      adminUsername: String,
    },
    selectionMethod: {
      type: String,
      enum: ["random", "manual", "system"],
      default: "random",
    },

    notified: { type: Boolean, default: false },
    notificationDate: Date,
    prizeSent: { type: Boolean, default: false },
    prizeSentDate: Date,
    confirmedByUser: { type: Boolean, default: false },
    confirmationDate: Date,

    verificationCode: String,
    verified: { type: Boolean, default: false },

    selectionNotes: String,

    selectedAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  },
);

const Winner = mongoose.model("Winner", winnerSchema);

const logSchema = new mongoose.Schema({
  level: {
    type: String,
    enum: ["error", "warn", "info", "debug"],
    required: true,
    index: true,
  },
  source: {
    type: String,
    enum: ["bot", "admin", "system", "database", "api"],
    required: true,
  },
  action: { type: String, required: true, index: true },

  userId: Number,
  adminId: Number,
  contestType: String,

  message: { type: String, required: true },
  details: mongoose.Schema.Types.Mixed,
  errorStack: String,

  ipAddress: String,
  userAgent: String,

  createdAt: { type: Date, default: Date.now, index: true },
});

const Log = mongoose.model("Log", logSchema);

const notificationSchema = new mongoose.Schema({
  adminId: { type: Number, required: true },
  adminUsername: String,

  message: { type: String, required: true },
  totalSent: { type: Number, default: 0 },
  successful: { type: Number, default: 0 },
  failed: { type: Number, default: 0 },

  filters: {
    subscribed: Boolean,
    participatedIn: String,
    minParticipationCount: Number,
  },

  scheduledAt: Date,
  sentAt: Date,
  completedAt: Date,

  status: {
    type: String,
    enum: ["pending", "sending", "completed", "failed"],
    default: "pending",
  },

  createdAt: { type: Date, default: Date.now, index: true },
});

const Notification = mongoose.model("Notification", notificationSchema);

// ============================
// 3. UTILITY FUNCTIONS - YANGILANGAN (SAFE FUNCTIONS QO'SHILDI)
// ============================
class Utils {
  static generateId() {
    return crypto.randomBytes(16).toString("hex");
  }

  static formatDate(date, format = "full") {
    const d = new Date(date);
    const options = {
      full: {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      },
      date: {
        year: "numeric",
        month: "long",
        day: "numeric",
      },
      time: {
        hour: "2-digit",
        minute: "2-digit",
      },
    };

    return d.toLocaleDateString("uz-UZ", options[format] || options.full);
  }

  // YANGI: Safe editMessageText funksiyasi
  static async safeEditMessageText(ctx, text, extra = {}) {
    try {
      return await ctx.editMessageText(text, extra);
    } catch (error) {
      // Agar "message is not modified" xatosi bo'lsa, ignore qilamiz
      if (
        error.description &&
        error.description.includes("message is not modified")
      ) {
        console.log("ℹ️ Message is not modified - ignoring error");
        return null; // Xatoni ignore qilamiz
      }

      // Boshqa xatolarni throw qilamiz
      throw error;
    }
  }

  // YANGI: Safe approve chat join request funksiyasi
  static async safeApproveChatJoinRequest(bot, chatId, userId) {
    try {
      // ChatId va userId ni to'g'ri formatlash
      const chatIdStr = String(chatId);
      const userIdNum = parseInt(userId);

      if (isNaN(userIdNum) || userIdNum <= 0) {
        console.error(`❌ Invalid user_id: ${userId}`);
        return false;
      }

      return await bot.telegram.approveChatJoinRequest(chatIdStr, userIdNum);
    } catch (error) {
      // Agar "invalid user_id" yoki "CHAT_ID_INVALID" bo'lsa, ignore qilamiz
      if (
        error.description &&
        (error.description.includes("invalid user_id") ||
          error.description.includes("CHAT_ID_INVALID") ||
          error.description.includes("USER_ID_INVALID"))
      ) {
        console.log(`⚠️ Join request error (ignored): ${error.description}`);
        return false;
      }

      // Boshqa xatolarni log qilamiz
      console.error(`❌ Chat join request error:`, error.message);
      throw error;
    }
  }

  // YANGI: Safe decline chat join request funksiyasi
  static async safeDeclineChatJoinRequest(bot, chatId, userId) {
    try {
      // ChatId va userId ni to'g'ri formatlash
      const chatIdStr = String(chatId);
      const userIdNum = parseInt(userId);

      if (isNaN(userIdNum) || userIdNum <= 0) {
        console.error(`❌ Invalid user_id: ${userId}`);
        return false;
      }

      return await bot.telegram.declineChatJoinRequest(chatIdStr, userIdNum);
    } catch (error) {
      // Agar "invalid user_id" yoki "CHAT_ID_INVALID" bo'lsa, ignore qilamiz
      if (
        error.description &&
        (error.description.includes("invalid user_id") ||
          error.description.includes("CHAT_ID_INVALID") ||
          error.description.includes("USER_ID_INVALID"))
      ) {
        console.log(
          `⚠️ Decline join request error (ignored): ${error.description}`,
        );
        return false;
      }

      // Boshqa xatolarni log qilamiz
      console.error(`❌ Decline chat join request error:`, error.message);
      throw error;
    }
  }

  // YANGILANGAN: Validatsiya funksiyasi (barcha konkurslar uchun 150 bilan boshlanish)
  static validateId(id, contestType) {
    const contest = CONFIG.CONTESTS[contestType.toUpperCase()];

    if (!contest) {
      throw new Error(`❌ Konkurs konfiguratsiyasi topilmadi: ${contestType}`);
    }

    // ID ni tozalash
    id = id.toString().trim().toUpperCase();

    // Bo'sh yoki undefined tekshirish
    if (!id || id === "") {
      throw new Error("❌ ID raqam kiritilmadi!");
    }

    // BARCHA konkurslar uchun bir xil validatsiya (150 bilan boshlanish)
    if (!/^\d+$/.test(id)) {
      throw new Error("❌ ID faqat raqamlardan iborat bo'lishi kerak!");
    }

    // Uzunlik tekshirish
    if (
      id.length < contest.id_min_length ||
      id.length > contest.id_max_length
    ) {
      throw new Error(
        `❌ ID ${contest.id_min_length} dan ${contest.id_max_length} gacha raqamdan iborat bo'lishi kerak!`,
      );
    }

    // 150 bilan boshlanishini tekshirish
    if (!/^\d+$/.test(id) || Number(id) < 150) {
      throw new Error(
        "❌ ID raqam noto'ri yoki eskirgan! ID 150 bilan boshlanishi kerak.",
      );
    }

    // Pattern tekshirish
    if (!contest.id_pattern.test(id)) {
      throw new Error("❌ ID noto'g'ri formatda!");
    }

    return id;
  }

  // YANGILANGAN: Retry operation (400 xatolarni retry qilmaslik)
  static async retryOperation(operation, maxRetries = 3, delay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        // Agar 400 xato bo'lsa (message is not modified, invalid user_id), retry qilmaymiz
        if (error.response && error.response.error_code === 400) {
          console.log(
            `⚠️ 400 error detected, skipping retry: ${error.description}`,
          );
          throw error;
        }

        if (i === maxRetries - 1) throw error;

        console.log(
          `🔄 Retry ${i + 1}/${maxRetries} after error: ${error.message}`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }

  static async logToFile(level, message, data = null) {
    try {
      const timestamp = new Date().toISOString();
      const logEntry =
        `${timestamp} [${level.toUpperCase()}] ${message}` +
        (data ? ` | ${JSON.stringify(data)}` : "") +
        "\n";

      const date = new Date().toISOString().split("T")[0];
      const logFile = path.join(CONFIG.PATHS.logs, `${date}.log`);

      await fs.mkdir(CONFIG.PATHS.logs, { recursive: true });
      await fs.appendFile(logFile, logEntry);
    } catch (error) {
      console.error("Log yozishda xatolik:", error);
    }
  }

  static escapeMarkdown(text) {
    const specialChars = [
      "_",
      "*",
      "[",
      "]",
      "(",
      ")",
      "~",
      "`",
      ">",
      "#",
      "+",
      "-",
      "=",
      "|",
      "{",
      "}",
      ".",
      "!",
    ];
    for (const char of specialChars) {
      text = text.replace(new RegExp(`\\${char}`, "g"), `\\${char}`);
    }
    return text;
  }

  static async sendMessageWithRetry(bot, chatId, text, options = {}) {
    try {
      return await bot.telegram.sendMessage(chatId, text, options);
    } catch (error) {
      if (error.response && error.response.error_code === 429) {
        // Too many requests - wait and retry
        const retryAfter = error.response.parameters?.retry_after || 1;
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
        return await bot.telegram.sendMessage(chatId, text, options);
      }
      throw error;
    }
  }
}

// ============================
// 4. DATABASE SERVICE
// ============================
class DatabaseService {
  static async initialize() {
    try {
      console.log("🔗 MongoDB ga ulanmoqda...");

      await mongoose.connect(CONFIG.MONGODB_URI, CONFIG.MONGODB_OPTIONS);

      mongoose.connection.on("connected", () => {
        console.log("✅ MongoDB ga muvaffaqiyatli ulandik");
        Utils.logToFile("info", "MongoDB connected successfully");
      });

      mongoose.connection.on("error", (err) => {
        console.error("❌ MongoDB connection error:", err);
        Utils.logToFile("error", "MongoDB connection error", {
          error: err.message,
        });
      });

      mongoose.connection.on("disconnected", () => {
        console.warn("⚠️ MongoDB disconnected");
        Utils.logToFile("warn", "MongoDB disconnected");
      });

      process.on("SIGINT", async () => {
        await mongoose.connection.close();
        console.log("MongoDB connection closed through app termination");
        process.exit(0);
      });

      return mongoose.connection;
    } catch (error) {
      console.error("❌ MongoDB ga ulanib bo'lmadi:", error);
      Utils.logToFile("error", "MongoDB connection failed", {
        error: error.message,
      });
      throw error;
    }
  }

  static async checkConnection() {
    try {
      if (mongoose.connection.readyState !== 1) {
        console.log("⚠️ MongoDB ulanmagan, qayta ulanmoqda...");
        await mongoose.connect(CONFIG.MONGODB_URI, CONFIG.MONGODB_OPTIONS);
        console.log("✅ MongoDB qayta ulandi");
      }
      return true;
    } catch (error) {
      console.error("❌ MongoDB qayta ulanishda xatolik:", error);
      return false;
    }
  }

  static async findOrCreateUser(ctx) {
    return await Utils.retryOperation(async () => {
      const { id, username, first_name, last_name, language_code } = ctx.from;

      try {
        let user = await User.findOne({ userId: id });

        if (!user) {
          user = new User({
            userId: id,
            telegramId: id,
            username: username,
            firstName: first_name,
            lastName: last_name,
            languageCode: language_code,
            ipAddress: ctx.ip,
            userAgent: ctx.telegram?.update_id ? "Telegram" : "Web",
            isSubscribed: false,
            contests: {
              iphone: { participated: false },
              redmi: { participated: false },
              gentra: { participated: false },
            },
            lastActivity: new Date(),
          });

          await user.save();

          await Log.create({
            level: "info",
            source: "bot",
            action: "user_created",
            userId: id,
            message: "Yangi foydalanuvchi yaratildi",
            details: { username, firstName: first_name },
          });

          console.log(
            `👤 Yangi foydalanuvchi: ${username || first_name} (${id})`,
          );
        } else {
          user.username = username;
          user.firstName = first_name;
          user.lastName = last_name;
          user.lastActivity = new Date();
          await user.save();
        }

        return user;
      } catch (error) {
        console.error("User yaratish/update qilishda xatolik:", error);
        throw error;
      }
    });
  }

  static async checkAndUpdateSubscription(bot, userId) {
    return await Utils.retryOperation(async () => {
      try {
        const user = await User.findOne({ userId });
        if (!user) {
          return {
            isSubscribed: false,
            notSubscribed: CONFIG.REQUIRED_CHANNELS,
          };
        }

        // Check cache (last 5 minutes)
        if (
          user.subscriptionCheckedAt &&
          Date.now() - user.subscriptionCheckedAt.getTime() <
            CONFIG.SETTINGS.cache_duration &&
          user.isSubscribed
        ) {
          return { isSubscribed: true, notSubscribed: [] };
        }

        const notSubscribed = [];
        const subscribedChannels = [];

        for (const channel of CONFIG.REQUIRED_CHANNELS) {
          try {
            let isMember = false;

            try {
              const member = await bot.getChatMember(channel.id, userId);
              isMember = !(
                member.status === "left" || member.status === "kicked"
              );
            } catch (error) {
              console.log(
                `Kanalni tekshirishda xatolik (${channel.name}):`,
                error.message,
              );
            }

            if (isMember) {
              subscribedChannels.push({
                channelId: channel.id,
                channelName: channel.name,
                subscribedAt: new Date(),
                isAdmin: false, // Public kanallar uchun admin tekshirish kerak emas
              });
            } else {
              notSubscribed.push(channel);
            }
          } catch (error) {
            console.error(
              `Kanalni tekshirishda xatolik (${channel.name}):`,
              error.message,
            );
            notSubscribed.push(channel);
          }
        }

        const isSubscribed = notSubscribed.length === 0;

        user.isSubscribed = isSubscribed;
        user.subscribedChannels = subscribedChannels;
        user.subscriptionCheckedAt = new Date();
        user.lastActivity = new Date();

        await user.save();

        await Log.create({
          level: "info",
          source: "bot",
          action: "subscription_checked",
          userId: userId,
          message: "Obuna holati tekshirildi",
          details: { isSubscribed, channels: subscribedChannels.length },
        });

        return { isSubscribed, notSubscribed };
      } catch (error) {
        console.error("Obunani tekshirishda xatolik:", error);
        throw error;
      }
    });
  }

  static async checkBotChannelsAccess(bot) {
    console.log("🔍 Botning kanallarga kirish huquqi tekshirilmoqda...");

    for (const channel of CONFIG.REQUIRED_CHANNELS) {
      try {
        const chat = await bot.getChat(channel.id);
        console.log(`✅ ${channel.name}: ${chat.type} kanaliga kirish mavjud`);
      } catch (error) {
        console.error(
          `❌ ${channel.name} kanaliga kirishda xatolik:`,
          error.message,
        );
        console.log(`⚠️ Botni ${channel.name} kanaliga ADMIN qilib qo'shing!`);
      }
    }
  }

  static async participateInContest(userId, contestType, participantId) {
    return await Utils.retryOperation(async () => {
      try {
        const user = await User.findOne({ userId });
        if (!user) {
          throw new Error("Foydalanuvchi topilmadi");
        }

        // Check if already participated
        if (user.contests[contestType]?.participated) {
          throw new Error("Siz allaqachon qatnashgansiz");
        }

        // Check ID uniqueness
        const existingUser = await User.findOne({
          [`contests.${contestType}.participantId`]: participantId,
          userId: { $ne: userId },
        });

        if (existingUser) {
          throw new Error(
            "Bu ID allaqachon boshqa foydalanuvchi tomonidan kiritilgan",
          );
        }

        // Update user
        user.contests[contestType] = {
          participated: true,
          participantId: participantId,
          participationDate: new Date(),
          verified: false,
        };

        user.participationCount += 1;
        user.lastActivity = new Date();

        await user.save();

        await Log.create({
          level: "info",
          source: "bot",
          action: "contest_participation",
          userId: userId,
          contestType: contestType,
          message: "Konkursga qatnashish",
          details: { contestType, participantId },
        });

        console.log(
          `🎯 Foydalanuvchi ${userId} ${contestType} konkursiga qatnashdi`,
        );

        return user;
      } catch (error) {
        console.error("Konkursga qatnashishda xatolik:", error);
        throw error;
      }
    });
  }

  static async handleUserLeftChannel(channelId, userId) {
    try {
      const user = await User.findOne({ userId });
      if (!user) return;

      // Remove channel from subscribed channels
      user.subscribedChannels = user.subscribedChannels.filter(
        (channel) => channel.channelId !== channelId,
      );

      // Update subscription status
      const channel = CONFIG.REQUIRED_CHANNELS.find((c) => c.id === channelId);
      if (channel) {
        // Check if user is still subscribed to other channels
        const subscription = await this.checkAndUpdateSubscription(
          null,
          userId,
        );

        if (!subscription.isSubscribed && user.isSubscribed) {
          // User left a required channel
          user.isSubscribed = false;

          // Notify user
          return {
            shouldNotify: true,
            channelName: channel.name,
            user,
          };
        }
      }

      user.lastActivity = new Date();
      await user.save();

      await Log.create({
        level: "warn",
        source: "system",
        action: "user_left_channel",
        userId: userId,
        message: "Foydalanuvchi kanaldan chiqdi",
        details: { channelId },
      });
    } catch (error) {
      console.error("Kanal chiqishini qayta ishlashda xatolik:", error);
    }
  }

  static async selectWinner(contestType, adminId, adminUsername) {
    return await Utils.retryOperation(async () => {
      try {
        // Check existing winners count
        const existingWinnersCount = await Winner.countDocuments({
          contestType,
        });
        const maxWinners =
          CONFIG.CONTESTS[contestType.toUpperCase()].prize_count;

        if (existingWinnersCount >= maxWinners) {
          throw new Error(
            `Barcha ${maxWinners} ta g'olib allaqachon aniqlangan`,
          );
        }

        // Get participants who haven't won yet
        const existingWinners = await Winner.find({ contestType });
        const winnerUserIds = existingWinners.map((w) => w.userId);

        const participants = await User.aggregate([
          {
            $match: {
              [`contests.${contestType}.participated`]: true,
              isSubscribed: true,
              userId: { $nin: winnerUserIds },
              isBlocked: false,
            },
          },
          { $sample: { size: 50 } },
        ]);

        if (participants.length === 0) {
          throw new Error("G'olib aniqlash uchun yangi ishtirokchilar yo'q");
        }

        // Random selection
        const randomIndex = Math.floor(Math.random() * participants.length);
        const winner = participants[randomIndex];

        // Create winner record
        const winnerRecord = new Winner({
          contestType: contestType,
          userId: winner.userId,
          userInfo: {
            telegramId: winner.userId,
            username: winner.username,
            firstName: winner.firstName,
            lastName: winner.lastName,
          },
          participantId: winner.contests[contestType].participantId,
          prizeNumber: existingWinnersCount + 1,
          selectedBy: {
            adminId: adminId,
            adminUsername: adminUsername,
          },
          selectionMethod: "random",
          verificationCode: Utils.generateId().substring(0, 8).toUpperCase(),
          selectedAt: new Date(),
        });

        await winnerRecord.save();

        await Log.create({
          level: "info",
          source: "admin",
          action: "winner_selected",
          adminId: adminId,
          contestType: contestType,
          message: "Yangi g'olib aniqlandi",
          details: {
            winnerId: winner.userId,
            contestType: contestType,
            prizeNumber: existingWinnersCount + 1,
          },
        });

        console.log(
          `🏆 Yangi g\'olib: ${winner.username || winner.firstName} (${winner.userId})`,
        );

        return winnerRecord;
      } catch (error) {
        console.error("G'olibni aniqlashda xatolik:", error);
        throw error;
      }
    });
  }

  static async getStatistics() {
    try {
      const [
        totalUsers,
        subscribedUsers,
        iphoneParticipants,
        redmiParticipants,
        gentraParticipants,
        iphoneWinners,
        redmiWinners,
        gentraWinners,
        todayUsers,
        activeUsers,
        blockedUsers,
      ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ isSubscribed: true }),
        User.countDocuments({
          "contests.iphone.participated": true,
          isSubscribed: true,
        }),
        User.countDocuments({
          "contests.redmi.participated": true,
          isSubscribed: true,
        }),
        User.countDocuments({
          "contests.gentra.participated": true,
          isSubscribed: true,
        }),
        Winner.countDocuments({ contestType: "iphone" }),
        Winner.countDocuments({ contestType: "redmi" }),
        Winner.countDocuments({ contestType: "gentra" }),
        User.countDocuments({
          createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        }),
        User.countDocuments({
          lastActivity: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        }),
        User.countDocuments({ isBlocked: true }),
      ]);

      return {
        totalUsers,
        subscribedUsers,
        iphoneParticipants,
        redmiParticipants,
        gentraParticipants,
        iphoneWinners,
        redmiWinners,
        gentraWinners,
        todayUsers,
        activeUsers,
        blockedUsers,
        iphoneRemaining: CONFIG.CONTESTS.IPHONE.prize_count - iphoneWinners,
        redmiRemaining: CONFIG.CONTESTS.REDMI.prize_count - redmiWinners,
        gentraRemaining: CONFIG.CONTESTS.GENTRA.prize_count - gentraWinners,
      };
    } catch (error) {
      console.error("Statistika olishda xatolik:", error);
      throw error;
    }
  }

  static async getWinners(contestType) {
    try {
      return await Winner.find({ contestType })
        .sort({ selectedAt: -1 })
        .limit(50);
    } catch (error) {
      console.error("G'oliblarni olishda xatolik:", error);
      throw error;
    }
  }

  static async broadcastMessage(bot, adminMessage, filters = {}) {
    let notification;

    try {
      // MongoDB ulanishini tekshirish
      await this.checkConnection();

      let query = {};
      if (filters.subscribed !== undefined)
        query.isSubscribed = filters.subscribed;
      if (filters.participatedIn)
        query[`contests.${filters.participatedIn}.participated`] = true;
      if (filters.minParticipationCount)
        query.participationCount = { $gte: filters.minParticipationCount };

      // Faqat active va blocked bo'lmagan userlarni olish
      query.isBlocked = false;
      query.isActive = true;

      const users = await User.find(query).select("userId").lean();

      notification = new Notification({
        adminId: filters.adminId || 0,
        adminUsername: filters.adminUsername || "admin",
        message: adminMessage.text || adminMessage.caption || "[BROADCAST]",
        totalSent: 0,
        successful: 0,
        failed: 0,
        filters,
        status: "sending",
        sentAt: new Date(),
      });
      await notification.save();

      let successful = 0;
      let failed = 0;
      const batchSize = CONFIG.SETTINGS.broadcast_batch_size || 15;
      const delayBetweenBatches = CONFIG.SETTINGS.broadcast_delay || 1500;

      console.log(
        `📤 Broadcast boshlanmoqda: ${users.length} ta foydalanuvchi`,
      );

      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);
        console.log(
          `📦 Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} ta user`,
        );

        const batchPromises = batch.map(async (user) => {
          try {
            // Telegram ID ni to'g'ri formatlash
            const chatId = String(user.userId);

            // Xabarni nusxalash
            if (adminMessage.poll) {
              // Poll yuborish
              const poll = adminMessage.poll;
              await bot.telegram.sendPoll(chatId, poll.question, poll.options, {
                is_anonymous: poll.is_anonymous || false,
                type: poll.type || "regular",
                allows_multiple_answers: poll.allows_multiple_answers || false,
                correct_option_id: poll.correct_option_id,
                explanation: poll.explanation,
                open_period: poll.open_period,
                close_date: poll.close_date,
              });
            } else if (adminMessage.photo) {
              // Rasm yuborish
              await bot.telegram.sendPhoto(
                chatId,
                adminMessage.photo[adminMessage.photo.length - 1].file_id,
                {
                  caption: adminMessage.caption,
                  parse_mode: adminMessage.parse_mode,
                  caption_entities: adminMessage.caption_entities,
                },
              );
            } else if (adminMessage.video) {
              // Video yuborish
              await bot.telegram.sendVideo(chatId, adminMessage.video.file_id, {
                caption: adminMessage.caption,
                parse_mode: adminMessage.parse_mode,
                caption_entities: adminMessage.caption_entities,
              });
            } else if (adminMessage.document) {
              // Hujjat yuborish
              await bot.telegram.sendDocument(
                chatId,
                adminMessage.document.file_id,
                {
                  caption: adminMessage.caption,
                  parse_mode: adminMessage.parse_mode,
                  caption_entities: adminMessage.caption_entities,
                },
              );
            } else if (adminMessage.audio) {
              // Audio yuborish
              await bot.telegram.sendAudio(chatId, adminMessage.audio.file_id, {
                caption: adminMessage.caption,
                parse_mode: adminMessage.parse_mode,
                caption_entities: adminMessage.caption_entities,
              });
            } else if (adminMessage.voice) {
              // Ovozli xabar yuborish
              await bot.telegram.sendVoice(chatId, adminMessage.voice.file_id, {
                caption: adminMessage.caption,
                parse_mode: adminMessage.parse_mode,
                caption_entities: adminMessage.caption_entities,
              });
            } else if (adminMessage.sticker) {
              // Sticker yuborish
              await bot.telegram.sendSticker(
                chatId,
                adminMessage.sticker.file_id,
              );
            } else {
              // Oddiy matn yuborish
              await bot.telegram.sendMessage(chatId, adminMessage.text, {
                parse_mode: adminMessage.parse_mode,
                entities: adminMessage.entities,
                disable_web_page_preview: adminMessage.disable_web_page_preview,
              });
            }

            successful++;
            console.log(`✅ ${chatId}: Xabar yuborildi`);

            // Har bir muvaffaqiyatli yuborishdan keyin kichik kutish
            await new Promise((resolve) => setTimeout(resolve, 100));
          } catch (error) {
            failed++;

            // Bloklangan foydalanuvchilarni belgilash
            const errorMessage = error.message || error.toString();
            if (
              errorMessage.includes("bot was blocked") ||
              errorMessage.includes("Forbidden") ||
              errorMessage.includes("user is deactivated") ||
              error.code === 403 ||
              error.response?.error_code === 403
            ) {
              try {
                await User.updateOne(
                  { userId: user.userId },
                  {
                    $set: {
                      isBlocked: true,
                      isActive: false,
                      blockReason: "Bot blocked by user",
                    },
                  },
                );
                console.log(`❌ ${user.userId}: Bot bloklangan (blocked)`);
              } catch (dbError) {
                console.log(`❌ DB update xatosi: ${dbError.message}`);
              }
            } else if (
              errorMessage.includes("Too Many Requests") ||
              error.code === 429 ||
              error.response?.error_code === 429
            ) {
              console.log(`⚠️ ${user.userId}: Rate limit (429)`);

              // Agar rate limit bo'lsa, kutilayotgan vaqtni olish
              const retryAfter = error.response?.parameters?.retry_after || 2;
              console.log(`⏳ ${retryAfter} soniya kutmoqda...`);
              await new Promise((resolve) =>
                setTimeout(resolve, retryAfter * 1000),
              );

              // Qayta urinish
              try {
                await bot.telegram.sendMessage(
                  String(user.userId),
                  adminMessage.text,
                  {
                    parse_mode: adminMessage.parse_mode,
                    entities: adminMessage.entities,
                    disable_web_page_preview:
                      adminMessage.disable_web_page_preview,
                  },
                );
                successful++;
                failed--;
                console.log(`✅ ${user.userId}: Qayta urinish muvaffaqiyatli`);
              } catch (retryError) {
                console.log(
                  `❌ ${user.userId}: Qayta urinish ham muvaffaqiyatsiz`,
                );
              }
            } else {
              console.log(`❌ ${user.userId}: ${errorMessage}`);
            }

            // Log faylga yozish
            await Utils.logToFile("error", `Broadcast xatosi: ${user.userId}`, {
              error: errorMessage,
              code: error.code,
            });
          }
        });

        // Batch dagi barcha promiselarni bajarish
        await Promise.allSettled(batchPromises);

        // MongoDB ulanishini qayta tekshirish
        await this.checkConnection();

        // Statistikani yangilash
        notification.totalSent = Math.min(i + batchSize, users.length);
        notification.successful = successful;
        notification.failed = failed;
        await notification.save();

        // Batchlar orasida kutish (rate limit uchun)
        if (i + batchSize < users.length) {
          console.log(`⏳ ${delayBetweenBatches}ms kutmoqda...`);
          await new Promise((resolve) =>
            setTimeout(resolve, delayBetweenBatches),
          );
        }
      }

      notification.status = "completed";
      notification.completedAt = new Date();
      await notification.save();

      console.log(
        `✅ Broadcast yakunlandi: ${successful} muvaffaqiyatli, ${failed} xato`,
      );

      return {
        total: users.length,
        successful,
        failed,
      };
    } catch (error) {
      console.error("📤 Broadcast jarayonida xatolik:", error);

      if (notification) {
        notification.status = "failed";
        await notification.save().catch(() => {});
      }

      throw error;
    }
  }
}

// ============================
// 5. BOT SCENES - YANGILANGAN (safeEditMessageText ishlatiladi)
// ============================
class BotScenes {
  static createContestScene(contestType) {
    const contest = CONFIG.CONTESTS[contestType.toUpperCase()];

    const scene = new Scenes.BaseScene(contestType.toLowerCase());

    scene.enter(async (ctx) => {
      try {
        const userId = ctx.from.id;

        // User ni tekshirish
        const user = await DatabaseService.findOrCreateUser(ctx);

        // Obunani tekshirish
        const subscription = await DatabaseService.checkAndUpdateSubscription(
          ctx.telegram,
          userId,
        );

        if (!subscription.isSubscribed) {
          await ctx.reply(
            "📢 *ILTIMOS, KANALLARGA OBUNA BO'LING!*\n\n" +
              "Botdan to'liq foydalanish uchun quyidagi kanallarga obuna bo'lishingiz kerak:",
            { parse_mode: "Markdown" },
          );
          await this.showChannelButtons(ctx, subscription.notSubscribed);
          return ctx.scene.leave();
        }

        // Agar allaqachon qatnashgan bo'lsa
        const hasParticipated =
          user.contests[contestType.toLowerCase()]?.participated || false;

        if (hasParticipated) {
          const participantId =
            user.contests[contestType.toLowerCase()]?.participantId;

          await ctx.reply(
            "ℹ️ *SIZ ALLAQACHON QATNASHGANSIZ!*\n\n" +
              "Siz ushbu konkursga allaqachon qatnashgansiz.\n" +
              `📝 Sizning ID raqamingiz: ${participantId || "Noma'lum"}`,
            { parse_mode: "Markdown" },
          );
          return ctx.scene.leave();
        }

        // Contest information
        const contestInfo =
          `${contest.emoji} *${contest.name} KONKURSI*\n\n` +
          `🎁 ${contest.description}\n\n` +
          `🎯 *Qatnashish shartlari:*\n` +
          contest.rules.map((rule, i) => `${i + 1}. ${rule}`).join("\n") +
          `\n\n` +
          `🔗 *Sayt:* ${contest.site_url}\n` +
          `🔑 *Promokod:* \`${contest.promo_code}\`\n\n` +
          `ID ni yuborish uchun quyidagi tugmani bosing:`;

        const escapedInfo = Utils.escapeMarkdown(contestInfo);

        await ctx.reply(escapedInfo, {
          parse_mode: "MarkdownV2",
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback(
                "✅ Qatnashish",
                `participate_${contestType.toLowerCase()}`,
              ),
            ],
            [
              Markup.button.callback(
                "❌ Bekor qilish",
                `cancel_${contestType.toLowerCase()}`,
              ),
            ],
          ]),
        });
      } catch (error) {
        console.error(`${contestType} scene enter error:`, error);
        await ctx.reply(
          "⚠️ Botda vaqtinchalik xatolik yuz berdi. Iltimos, keyinroq urinib ko'ring.",
          { parse_mode: "Markdown" },
        );
        ctx.scene.leave();
      }
    });
    // Qatnashish action - YANGILANGAN (safeEditMessageText ishlatiladi)
    scene.action(`participate_${contestType.toLowerCase()}`, async (ctx) => {
      try {
        await Utils.safeEditMessageText(
          ctx,
          Utils.escapeMarkdown(
            "📝 *ID raqamingizni yuboring:*\n\n" +
              "Iltimos, saytdan olingan ID raqamingizni yuboring.\n" +
              'ID "153" bilan boshlanadi, masalan: 153123456\n\n' +
              "*Eslatma:* ID ni to'g'ri kiriting, keyinchalik o'zgartirib bo'lmaydi!",
          ),
          {
            parse_mode: "MarkdownV2",
          },
        );

        // Wait for ID input
        scene.on("text", async (ctx) => {
          try {
            const userId = ctx.from.id;
            const participantId = ctx.message.text.trim();

            console.log(`${contestType} uchun ID kiritildi: ${participantId}`);

            // Validate ID
            let validId;
            try {
              validId = Utils.validateId(participantId, contestType);
              console.log(`ID validatsiyadan o'tdi: ${validId}`);
            } catch (validationError) {
              console.log(`Validatsiya xatosi: ${validationError.message}`);

              await ctx.reply(
                Utils.escapeMarkdown(
                  "❌ *NOTO'G'RI FORMAT!*\n\nID \"153\" bilan boshlanishi va faqat raqamlardan iborat bo'lishi kerak!\nMasalan: 153123456",
                ),
                {
                  parse_mode: "MarkdownV2",
                },
              );

              // Scene ni qayta kiritish
              return scene.enter(ctx);
            }

            // Participate in contest
            await DatabaseService.participateInContest(
              userId,
              contestType.toLowerCase(),
              validId,
            );

            await ctx.reply(
              Utils.escapeMarkdown(
                "🎉 *TABRIKLAYMIZ!*\n\n" +
                  "Siz konkursga muvaffaqiyatli qatnashdingiz!\n" +
                  `📝 Sizning ID raqamingiz: \`${validId}\`\n\n` +
                  "🏆 G'oliblar adminlar tomonidan aniqlanadi va sizga xabar beriladi.\n" +
                  "🔔 Kutib turing, natijalar yaqin orada e'lon qilinadi!\n\n" +
                  "⚠️ *Diqqat:* Agar kanallardan chiqsangiz, konkursdan avtomatik chetlashtirilasiz!",
              ),
              { parse_mode: "MarkdownV2" },
            );

            // Show main menu
            await this.showMainMenu(ctx);
          } catch (error) {
            console.error(`${contestType} ID qayta ishlash xatosi:`, error);
            await ctx.reply(Utils.escapeMarkdown(error.message), {
              parse_mode: "MarkdownV2",
            });
            return scene.enter(ctx);
          } finally {
            ctx.scene.leave();
          }
        });

        // Handle non-text messages
        scene.on("message", async (ctx) => {
          if (ctx.message.text) return;
          await ctx.reply("❌ Iltimos, faqat ID raqamini yuboring!", {
            parse_mode: "Markdown",
          });
        });
      } catch (error) {
        console.error(`${contestType} participation error:`, error);
        await ctx.reply(
          "⚠️ Botda vaqtinchalik xatolik yuz berdi. Iltimos, keyinroq urinib ko'ring.",
          { parse_mode: "Markdown" },
        );
        ctx.scene.leave();
      }
    });

    // Bekor qilish action - YANGILANGAN (safeEditMessageText ishlatiladi)
    scene.action(`cancel_${contestType.toLowerCase()}`, async (ctx) => {
      await Utils.safeEditMessageText(ctx, "❌ Konkurs bekor qilindi.");
      ctx.scene.leave();
      await this.showMainMenu(ctx);
    });

    return scene;
  }

  static createAdminScene() {
    const scene = new Scenes.BaseScene("admin");

    scene.enter(async (ctx) => {
      try {
        if (!CONFIG.ADMIN_IDS.includes(ctx.from.id)) {
          return ctx.reply("❌ Siz admin emassiz!");
        }

        await ctx.reply(
          "👨‍💻 *ADMIN PANEL*\n\n" +
            "Botni boshqarish paneli. Quyidagi tugmalardan birini tanlang:",
          {
            parse_mode: "Markdown",
            ...Markup.inlineKeyboard([
              [Markup.button.callback("📊 Statistika", "admin_stats")],
              [Markup.button.callback("📣 Xabar yuborish", "admin_broadcast")],
              [Markup.button.callback("🚪 Chiqish", "exit_admin")],
            ]),
          },
        );
      } catch (error) {
        console.error("Admin scene enter error:", error);
        await ctx.reply(
          "⚠️ Botda vaqtinchalik xatolik yuz berdi. Iltimos, keyinroq urinib ko'ring.",
          { parse_mode: "Markdown" },
        );
        ctx.scene.leave();
      }
    });

    // Admin actions - YANGILANGAN (safeEditMessageText ishlatiladi)
    scene.action("admin_stats", async (ctx) => {
      try {
        const stats = await DatabaseService.getStatistics();

        await Utils.safeEditMessageText(
          ctx,
          `📊 *BOT STATISTIKASI*\n\n` +
            `👥 *Jami foydalanuvchilar:* ${stats.totalUsers}\n` +
            `🚫 *Bloklanganlar:* ${stats.blockedUsers}\n` +
            `📈 *Bugun qo\'shilgan:* ${stats.todayUsers}\n` +
            `🔥 *Faol foydalanuvchilar:* ${stats.activeUsers}\n` +
            `✅ *Obuna bo\'lganlar:* ${stats.subscribedUsers}\n\n` +
            `📱 *iPhone ishtirokchilar:* ${stats.iphoneParticipants}\n` +
            `📱 *Redmi ishtirokchilar:* ${stats.redmiParticipants}\n` +
            `🚗 *Gentra ishtirokchilar:* ${stats.gentraParticipants}\n\n` +
            `🏆 *iPhone g\'oliblari:* ${stats.iphoneWinners}/${CONFIG.CONTESTS.IPHONE.prize_count}\n` +
            `🏆 *Redmi g\'oliblari:* ${stats.redmiWinners}/${CONFIG.CONTESTS.REDMI.prize_count}\n` +
            `🏆 *Gentra g\'oliblari:* ${stats.gentraWinners}/${CONFIG.CONTESTS.GENTRA.prize_count}\n\n` +
            `🕒 *Oxirgi yangilanish:* ${Utils.formatDate(new Date(), "time")}`,
          { parse_mode: "Markdown" },
        );
      } catch (error) {
        console.error("Admin stats error:", error);
        await ctx.answerCbQuery("❌ Statistika olishda xatolik!");
      }
    });

    scene.action("admin_broadcast", async (ctx) => {
      try {
        await Utils.safeEditMessageText(
          ctx,
          "📣 *XABAR YUBORISH*\n\nXabarni yuborishni boshlash uchun tugmani bosing:",
          {
            parse_mode: "Markdown",
            ...Markup.inlineKeyboard([
              [Markup.button.callback("📢 Hammaga yuborish", "broadcast_all")],
              [Markup.button.callback("🔙 Orqaga", "back_to_admin")],
            ]),
          },
        );
      } catch (error) {
        console.error("Broadcast menu error:", error);
        await ctx.answerCbQuery("❌ Xatolik yuz berdi!");
      }
    });

    scene.action("broadcast_all", async (ctx) => {
      try {
        if (!CONFIG.ADMIN_IDS.includes(ctx.from.id)) return;

        ctx.session.broadcast = {
          enabled: true,
          filters: {}, // hammaga
        };

        await ctx.reply(
          "✅ Endi yubormoqchi bo‘lgan xabaringizni yuboring.\n\n" +
            "🟢 Matn / rasm / video / voice / dumaloq video / fayl / poll — hammasi bo‘ladi.\n" +
            "❌ Bekor qilish: /cancel",
          { parse_mode: "Markdown" },
        );

        await ctx.answerCbQuery();
      } catch (e) {
        console.error("broadcast_all error:", e);
        await ctx.answerCbQuery("❌ Xatolik!");
      }
    });

    scene.on("message", async (ctx) => {
      try {
        if (!CONFIG.ADMIN_IDS.includes(ctx.from.id)) return;

        // /cancel komandasi
        if (ctx.message?.text === "/cancel") {
          ctx.session.broadcast = null;
          return ctx.reply("❌ Broadcasting bekor qilindi.");
        }

        // Broadcast rejimida bo'lsa
        if (ctx.session.broadcast?.enabled) {
          const filters = ctx.session.broadcast.filters || {};

          // Foydalanuvchilarning sonini tekshirish
          let query = {};
          if (filters.subscribed !== undefined)
            query.isSubscribed = filters.subscribed;
          if (filters.participatedIn)
            query[`contests.${filters.participatedIn}.participated`] = true;
          if (filters.minParticipationCount)
            query.participationCount = { $gte: filters.minParticipationCount };

          const userCount = await User.countDocuments(query);

          if (userCount > 500) {
            await ctx.reply(
              `⚠️ *DIQQAT!*\n\n` +
                `Siz ${userCount} ta foydalanuvchiga xabar yubormoqchisiz.\n\n` +
                `Bu jarayon ${Math.ceil(userCount / CONFIG.SETTINGS.broadcast_batch_size) * (CONFIG.SETTINGS.broadcast_delay / 1000)} sekund davom etadi.\n\n` +
                `Davom ettirish uchun "✅ Davom ettirish" tugmasini bosing yoki /cancel tugmasini bosing.`,
              {
                parse_mode: "Markdown",
                ...Markup.inlineKeyboard([
                  [
                    Markup.button.callback(
                      "✅ Davom ettirish",
                      "confirm_broadcast",
                    ),
                  ],
                  [
                    Markup.button.callback(
                      "❌ Bekor qilish",
                      "cancel_broadcast",
                    ),
                  ],
                ]),
              },
            );

            // Tasdiqni kutish
            ctx.session.pendingBroadcast = {
              message: ctx.message,
              filters: filters,
            };
            ctx.session.broadcast.enabled = false;
            return;
          }

          // Agar userlar kam bo'lsa, darrov boshlash
          await ctx.reply(
            `🚀 Xabar yuborish boshlanmoqda...\n👥 ${userCount} ta foydalanuvchi`,
          );

          const result = await DatabaseService.broadcastMessage(
            ctx.telegram,
            ctx.message,
            {
              ...filters,
              adminId: ctx.from.id,
              adminUsername: ctx.from.username,
            },
          );

          ctx.session.broadcast = null;

          await ctx.reply(
            `✅ *Xabar yuborish tugadi!*\n\n` +
              `📊 *Statistika:*\n` +
              `👥 Jami foydalanuvchilar: ${result.total}\n` +
              `✅ Muvaffaqiyatli: ${result.successful}\n` +
              `❌ Xato: ${result.failed}\n` +
              `📈 Muvaffaqiyat darajasi: ${((result.successful / result.total) * 100).toFixed(1)}%`,
            { parse_mode: "Markdown" },
          );
        }
      } catch (error) {
        console.error("Broadcast message handler error:", error);
        ctx.session.broadcast = null;
        await ctx.reply("❌ Xabar yuborishda xatolik yuz berdi.");
      }
    });

    // Tasdiq tugmasi
    scene.action("confirm_broadcast", async (ctx) => {
      try {
        await ctx.answerCbQuery();
        await ctx.deleteMessage();

        const pending = ctx.session.pendingBroadcast;
        if (!pending) {
          return ctx.reply("❌ Tasdiqlash ma'lumotlari topilmadi.");
        }

        await ctx.reply("🚀 Xabar yuborish boshlanmoqda...");

        const result = await DatabaseService.broadcastMessage(
          ctx.telegram,
          pending.message,
          {
            ...pending.filters,
            adminId: ctx.from.id,
            adminUsername: ctx.from.username,
          },
        );

        ctx.session.pendingBroadcast = null;
        ctx.session.broadcast = null;

        await ctx.reply(
          `✅ *Xabar yuborish tugadi!*\n\n` +
            `📊 *Statistika:*\n` +
            `👥 Jami foydalanuvchilar: ${result.total}\n` +
            `✅ Muvaffaqiyatli: ${result.successful}\n` +
            `❌ Xato: ${result.failed}\n` +
            `📈 Muvaffaqiyat darajasi: ${((result.successful / result.total) * 100).toFixed(1)}%`,
          { parse_mode: "Markdown" },
        );
      } catch (error) {
        console.error("Confirm broadcast error:", error);
        await ctx.reply("❌ Xabar yuborishda xatolik yuz berdi.");
      }
    });

    // Bekor qilish tugmasi
    scene.action("cancel_broadcast", async (ctx) => {
      await ctx.answerCbQuery();
      await ctx.deleteMessage();

      ctx.session.pendingBroadcast = null;
      ctx.session.broadcast = null;

      await ctx.reply("❌ Broadcasting bekor qilindi.");
    });

    // Orqaga tugmasi
    scene.action("back_to_admin", async (ctx) => {
      await ctx.scene.reenter();
    });

    // Chiqish tugmasi
    scene.action("exit_admin", async (ctx) => {
      await ctx.editMessageText("👋 Admin panelidan chiqildi.");
      ctx.scene.leave();
    });

    return scene;
  }

  static async showMainMenu(ctx) {
    try {
      await ctx.reply(
        "🏠 *ASOSIY MENYU*\n\n" + "Quyidagi konkurslardan birini tanlang:",
        {
          parse_mode: "Markdown",
          ...Markup.keyboard([
            [CONFIG.CONTESTS.IPHONE.button_text],
            [CONFIG.CONTESTS.REDMI.button_text],
            [CONFIG.CONTESTS.GENTRA.button_text],
            ["📋 Konkurs haqida", "🔄 Obunani tekshirish"],
          ])
            .resize()
            .oneTime(),
        },
      );
    } catch (error) {
      console.error("Main menu error:", error);
    }
  }

  static async showChannelButtons(ctx, channels) {
    try {
      const buttons = channels.map((channel) => {
        return [Markup.button.url(`📢 ${channel.name}`, channel.url)];
      });

      buttons.push([
        Markup.button.callback("✅ Obunani tekshirish", "check_subscription"),
      ]);

      const message =
        "Botdan to'liq foydalanish uchun quyidagi kanallarga obuna bo'ling:";

      await ctx.reply(Utils.escapeMarkdown(message), {
        parse_mode: "MarkdownV2",
        ...Markup.inlineKeyboard(buttons),
      });
    } catch (error) {
      console.error("Channel buttons error:", error);
    }
  }
}

// ============================
// 6. BOT MAIN CLASS - YANGILANGAN (Global Error Handlers qo'shildi)
// ============================
class SenatorBot {
  constructor() {
    this.bot = new Telegraf(CONFIG.BOT_TOKEN);
    this.scenes = [];
    this.stage = null;
    this.initialized = false;

    // Global error handlers
    this.setupGlobalErrorHandlers();
  }

  setupGlobalErrorHandlers() {
    // Unhandled promise rejections
    process.on("unhandledRejection", (reason, promise) => {
      console.error("⚠️ Unhandled Rejection at:", promise, "reason:", reason);
      Utils.logToFile("error", "Unhandled Rejection", {
        reason: reason?.message || reason,
        stack: reason?.stack,
      });
    });

    // Uncaught exceptions
    process.on("uncaughtException", (error) => {
      console.error("⚠️ Uncaught Exception:", error);
      Utils.logToFile("error", "Uncaught Exception", {
        error: error.message,
        stack: error.stack,
      });
      // Botni o'chirmaymiz, faqat log qilamiz
    });

    console.log("✅ Global error handlers initialized");
  }

  async initialize() {
    try {
      console.log("🚀 Bot ishga tushirilmoqda...");

      // Create directories
      await this.createDirectories();

      // Initialize database
      await DatabaseService.initialize();

      // Create scenes
      const iphoneScene = BotScenes.createContestScene("IPHONE");
      const redmiScene = BotScenes.createContestScene("REDMI");
      const gentraScene = BotScenes.createContestScene("GENTRA");
      const adminScene = BotScenes.createAdminScene();

      this.scenes = [iphoneScene, redmiScene, gentraScene, adminScene];
      this.stage = new Scenes.Stage(this.scenes);

      // Setup middleware
      this.bot.use(session());
      this.bot.use(this.stage.middleware());

      // Setup error handling middleware
      this.bot.use(async (ctx, next) => {
        try {
          await next();
        } catch (error) {
          console.error("Bot error:", error);
          Utils.logToFile("error", "Bot middleware error", {
            error: error.message,
            stack: error.stack,
          });

          try {
            if (ctx.callbackQuery) {
              await ctx.answerCbQuery(
                "⚠️ Xatolik yuz berdi. Keyinroq urinib ko'ring.",
              );
            } else if (ctx.message) {
              await ctx.reply(
                "⚠️ Botda vaqtinchalik xatolik yuz berdi. Iltimos, keyinroq urinib ko'ring.",
                { parse_mode: "Markdown" },
              );
            }
          } catch (e) {
            console.error("Error reply failed:", e);
          }
        }
      });

      // Setup user middleware
      this.bot.use(async (ctx, next) => {
        if (ctx.message || ctx.callbackQuery) {
          await DatabaseService.findOrCreateUser(ctx);
        }
        await next();
      });

      // Register commands and handlers
      this.registerCommands();
      this.registerActions();
      this.registerEventHandlers();

      this.initialized = true;
      console.log("✅ Bot muvaffaqiyatli ishga tushirildi!");
    } catch (error) {
      console.error("❌ Botni ishga tushirishda xatolik:", error);
      throw error;
    }
  }

  async createDirectories() {
    try {
      for (const path of Object.values(CONFIG.PATHS)) {
        await fs.mkdir(path, { recursive: true });
      }
      console.log("📁 Papkalar yaratildi");
    } catch (error) {
      console.error("Papkalar yaratishda xatolik:", error);
    }
  }

  registerCommands() {
    // Start command
    this.bot.start(async (ctx) => {
      try {
        const userId = ctx.from.id;

        // Check subscription
        const subscription = await DatabaseService.checkAndUpdateSubscription(
          ctx.telegram,
          userId,
        );

        if (subscription.notSubscribed.length > 0) {
          await ctx.reply(
            "🎉 *SENATOR KONKURS BOTIGA XUSH KELIBSIZ!*\n\n" +
              "Bu bot orqali siz quyidagi sovg'alarni yutib olishingiz mumkin:\n" +
              "🏆 5 ta iPhone 17 Pro Max\n" +
              "🏆 10 ta Redmi telefon\n" +
              "🏆 1 ta Chevrolet Gentra avtomobil\n\n" +
              "Botdan foydalanish uchun avval quyidagi kanallarga obuna bo'ling:",
            { parse_mode: "Markdown" },
          );
          await BotScenes.showChannelButtons(ctx, subscription.notSubscribed);
        } else {
          await ctx.reply(
            "✅ *BARCHA KANALLARGA OBUNA BO'LGANSIZ!*\n\n" +
              "Endi konkurslarda qatnashishingiz mumkin.\n" +
              "Quyidagi menyudan kerakli konkursni tanlang:",
            { parse_mode: "Markdown" },
          );
          await BotScenes.showMainMenu(ctx);
        }
      } catch (error) {
        console.error("Start command error:", error);
        await ctx.reply(
          "⚠️ Botda vaqtinchalik xatolik yuz berdi. Iltimos, keyinroq urinib ko'ring.",
          { parse_mode: "Markdown" },
        );
      }
    });

    // Admin command
    this.bot.command("admin", async (ctx) => {
      if (!CONFIG.ADMIN_IDS.includes(ctx.from.id)) {
        return ctx.reply("❌ Siz admin emassiz!");
      }
      ctx.scene.enter("admin");
    });

    // Help command
    this.bot.command("help", async (ctx) => {
      await ctx.reply(
        "🏆 *KONKURS HAQIDA MA'LUMOT*\n\n" +
          "🎁 *Sovg'alar:*\n" +
          "• 5 ta iPhone 17 Pro Max\n" +
          "• 10 ta Redmi telefon\n" +
          "• 1 ta Chevrolet Gentra avtomobil\n\n" +
          "📱 *iPhone 17 Pro Max yutish uchun:*\n" +
          "1. Saytga kirish\n" +
          "2. Promokod: SENATOR\n" +
          "3. Ro'yxatdan o'tish\n" +
          "4. ID ni yuborish\n\n" +
          "📱 *Redmi yutish uchun:*\n" +
          "1. Saytga kirish\n" +
          "2. Promokod: SENATOR\n" +
          "3. Ro'yxatdan o'tish\n" +
          "4. ID ni yuborish\n\n" +
          "🚗 *Gentra yutish uchun:*\n" +
          "1. Saytga kirish\n" +
          "2. Promokod: SENATOR\n" +
          "3. Ariza to'ldirish\n" +
          "4. ID ni yuborish\n\n" +
          "⚠️ *DIQQAT!*\n" +
          "• Har bir foydalanuvchi faqat bir marta qatnashishi mumkin!\n" +
          "• Agar kanallardan chiqsangiz, konkursdan avtomatik chetlashtirilasiz!\n" +
          "• Ba'zi kanallarga ADMIN bo'lish talab qilinadi!",
        { parse_mode: "Markdown" },
      );
    });

    // Stats command
    this.bot.command("stats", async (ctx) => {
      if (!CONFIG.ADMIN_IDS.includes(ctx.from.id)) {
        return ctx.reply("❌ Siz admin emassiz!");
      }

      try {
        const stats = await DatabaseService.getStatistics();
        await ctx.reply(
          `📊 Statistika:\n\n` +
            `Jami: ${stats.totalUsers}\n` +
            `Obuna: ${stats.subscribedUsers}\n` +
            `iPhone: ${stats.iphoneParticipants}\n` +
            `Redmi: ${stats.redmiParticipants}\n` +
            `Gentra: ${stats.gentraParticipants}`,
          { parse_mode: "Markdown" },
        );
      } catch (error) {
        console.error("Stats command error:", error);
      }
    });
  }

  registerActions() {
    // Check subscription action
    this.bot.action("check_subscription", async (ctx) => {
      try {
        await ctx.answerCbQuery();
        const userId = ctx.from.id;
        const subscription = await DatabaseService.checkAndUpdateSubscription(
          ctx.telegram,
          userId,
        );

        if (subscription.notSubscribed.length > 0) {
          await ctx.editMessageText(
            "📢 *ILTIMOS, KANALLARGA OBUNA BO'LING!*\n\n" +
              "Botdan to'liq foydalanish uchun quyidagi kanallarga obuna bo'lishingiz kerak:",
            { parse_mode: "Markdown" },
          );
          await BotScenes.showChannelButtons(ctx, subscription.notSubscribed);
        } else {
          await ctx.editMessageText(
            "✅ *BARCHA KANALLARGA OBUNA BO'LGANSIZ!*\n\n" +
              "Endi konkurslarda qatnashishingiz mumkin.\n" +
              "Quyidagi menyudan kerakli konkursni tanlang:",
            { parse_mode: "Markdown" },
          );
          await BotScenes.showMainMenu(ctx);
        }
      } catch (error) {
        console.error("Check subscription error:", error);
        await ctx.answerCbQuery("❌ Xatolik yuz berdi!");
      }
    });

    // Contest buttons
    this.bot.hears(CONFIG.CONTESTS.IPHONE.button_text, async (ctx) => {
      await this.handleContestButton(ctx, "IPHONE");
    });

    this.bot.hears(CONFIG.CONTESTS.REDMI.button_text, async (ctx) => {
      await this.handleContestButton(ctx, "REDMI");
    });

    this.bot.hears(CONFIG.CONTESTS.GENTRA.button_text, async (ctx) => {
      await this.handleContestButton(ctx, "GENTRA");
    });

    // Other buttons
    this.bot.hears("📋 Konkurs haqida", async (ctx) => {
      await ctx.reply(
        "🏆 *KONKURS HAQIDA MA'LUMOT*\n\n" +
          "🎁 *Sovg'alar:*\n" +
          "• 5 ta iPhone 17 Pro Max\n" +
          "• 10 ta Redmi telefon\n" +
          "• 1 ta Chevrolet Gentra avtomobil\n\n" +
          "📱 *iPhone 17 Pro Max yutish uchun:*\n" +
          "1. Saytga kirish\n" +
          "2. Promokod: SENATOR\n" +
          "3. Ro'yxatdan o'tish\n" +
          "4. ID ni yuborish\n\n" +
          "📱 *Redmi yutish uchun:*\n" +
          "1. Saytga kirish\n" +
          "2. Promokod: SENATOR\n" +
          "3. Ro'yxatdan o'tish\n" +
          "4. ID ni yuborish\n\n" +
          "🚗 *Gentra yutish uchun:*\n" +
          "1. Saytga kirish\n" +
          "2. Promokod: SENATOR\n" +
          "3. Ariza to'ldirish\n" +
          "4. ID ni yuborish\n\n" +
          "⚠️ *DIQQAT!*\n" +
          "• Har bir foydalanuvchi faqat bir marta qatnashishi mumkin!\n" +
          "• Agar kanallardan chiqsangiz, konkursdan avtomatik chetlashtirilasiz!\n" +
          "• Ba'zi kanallarga ADMIN bo'lish talab qilinadi!",
        { parse_mode: "Markdown" },
      );
    });

    this.bot.hears("🔄 Obunani tekshirish", async (ctx) => {
      const userId = ctx.from.id;
      const subscription = await DatabaseService.checkAndUpdateSubscription(
        ctx.telegram,
        userId,
      );

      if (subscription.notSubscribed.length > 0) {
        await ctx.reply(
          "❌ *SIZ BARCHA KANALLARGA OBUNA BO'LMAGANSIZ!*\n\n" +
            "Quyidagi kanallarga obuna bo'lishingiz kerak:",
          { parse_mode: "Markdown" },
        );
        await BotScenes.showChannelButtons(ctx, subscription.notSubscribed);
      } else {
        await ctx.reply(
          "✅ *BARCHA KANALLARGA OBUNA BO'LGANSIZ!*\n\n" +
            "Siz konkurslarda qatnashishingiz mumkin.",
          { parse_mode: "Markdown" },
        );
      }
    });
  }

  async handleContestButton(ctx, contestType) {
    const userId = ctx.from.id;

    try {
      const user = await User.findOne({ userId });
      const subscription = await DatabaseService.checkAndUpdateSubscription(
        ctx.telegram,
        userId,
      );

      if (!subscription.isSubscribed) {
        await ctx.reply("❌ Avval barcha kanallarga obuna bo'ling!", {
          parse_mode: "Markdown",
        });
        await BotScenes.showChannelButtons(ctx, subscription.notSubscribed);
        return;
      }

      if (user && user.contests[contestType.toLowerCase()]?.participated) {
        const participantId =
          user.contests[contestType.toLowerCase()]?.participantId;
        await ctx.reply(
          "ℹ️ *SIZ ALLAQACHON QATNASHGANSIZ!*\n\n" +
            "Siz ushbu konkursga allaqachon qatnashgansiz.\n" +
            `📝 Sizning ID raqamingiz: ${participantId || "Noma'lum"}`,
          { parse_mode: "Markdown" },
        );
        return;
      }

      ctx.scene.enter(contestType.toLowerCase());
    } catch (error) {
      console.error(`${contestType} contest error:`, error);
      await ctx.reply(
        "⚠️ Botda vaqtinchalik xatolik yuz berdi. Iltimos, keyinroq urinib ko'ring.",
        { parse_mode: "Markdown" },
      );
    }
  }

  registerEventHandlers() {
    // YANGILANGAN: chat_join_request handler - to'g'ri yo'l bilan
    this.bot.on("chat_join_request", async (ctx) => {
      try {
        const request = ctx.update.chat_join_request;
        const userId = request.from.id;
        const chatId = request.chat.id;
        const user = request.from;

        console.log(
          `🔔 Join request from ${userId} (@${user.username || "no-username"}) to chat ${chatId}`,
        );

        // Check if this is one of our public channels
        const channel = CONFIG.REQUIRED_CHANNELS.find(
          (c) => c.id === chatId.toString(),
        );

        if (!channel) {
          console.log(`ℹ️ Join request to unmonitored chat: ${chatId}`);
          return;
        }

        console.log(`✅ Processing join request for ${channel.name}`);

        // Public kanallar uchun avtomatik qabul qilamiz
        try {
          await Utils.safeApproveChatJoinRequest(this.bot, chatId, userId);
          console.log(
            `✅ Approved join request for ${userId} to ${channel.name}`,
          );

          // Send welcome message
          try {
            await this.bot.telegram.sendMessage(
              userId,
              `✅ *QABUL QILINDI!*\n\n` +
                `Siz "${channel.name}" kanaliga qabul qilindingiz!\n\n` +
                `Endi boshqa kanallarga ham obuna bo'lishingizni tekshirib ko'ring.`,
              { parse_mode: "Markdown" },
            );
          } catch (error) {
            console.error("Qabul xabarini yuborishda xatolik:", error.message);
          }

          // Update user subscription status
          try {
            await DatabaseService.checkAndUpdateSubscription(this.bot, userId);
          } catch (error) {
            console.error("User subscription update error:", error.message);
          }
        } catch (error) {
          console.error(`❌ Join request processing error:`, error.message);
          // Xato allaqachon safeApproveChatJoinRequest ichida log qilingan
        }
      } catch (error) {
        console.error("❌ Join request handler error:", error);
        Utils.logToFile("error", "Join request handler error", {
          error: error.message,
          stack: error.stack,
        });
      }
    });

    // Handle chat member updates (user leaving/joining channels)
    this.bot.on("chat_member", async (ctx) => {
      try {
        const chatMember = ctx.chatMember;
        const userId = chatMember.new_chat_member.user.id;
        const chatId = chatMember.chat.id;

        // Check if this is one of our monitored channels
        const channel = CONFIG.REQUIRED_CHANNELS.find(
          (c) => c.id === chatId.toString(),
        );
        if (!channel) return;

        const oldStatus = chatMember.old_chat_member.status;
        const newStatus = chatMember.new_chat_member.status;

        // User left the channel
        if (
          (oldStatus === "member" || oldStatus === "administrator") &&
          (newStatus === "left" || newStatus === "kicked")
        ) {
          console.log(`👋 User ${userId} left channel ${channel.name}`);

          const result = await DatabaseService.handleUserLeftChannel(
            chatId,
            userId,
          );

          // Notify user if they were subscribed
          if (result && result.shouldNotify) {
            try {
              await this.bot.telegram.sendMessage(
                userId,
                `⚠️ *DIQQAT!*\n\n` +
                  `Siz "${result.channelName}" kanalidan chiqdingiz!\n\n` +
                  `❌ Bu sababli siz konkurslardan chetlashtirildingiz!\n\n` +
                  `Qayta qatnashish uchun kanalga qayta obuna bo'ling:`,
                {
                  parse_mode: "Markdown",
                  ...Markup.inlineKeyboard([
                    [
                      Markup.button.url(
                        `📢 ${channel.name}ga qaytish`,
                        channel.url,
                      ),
                    ],
                    [
                      Markup.button.callback(
                        "🔄 Obunani tekshirish",
                        "check_subscription",
                      ),
                    ],
                  ]),
                },
              );
            } catch (error) {
              console.error("Foydalanuvchiga xabar yuborishda xatolik:", error);
            }
          }
        }

        // User joined the channel
        if (
          (oldStatus === "left" || oldStatus === "kicked") &&
          (newStatus === "member" || newStatus === "administrator")
        ) {
          console.log(`👋 User ${userId} joined channel ${channel.name}`);

          // Check if user is now subscribed to all channels
          const subscription = await DatabaseService.checkAndUpdateSubscription(
            this.bot.telegram,
            userId,
          );

          if (subscription.isSubscribed) {
            try {
              await this.bot.telegram.sendMessage(
                userId,
                "✅ *BARCHA KANALLARGA OBUNA BO'LDINGIZ!*\n\n" +
                  "Endi konkurslarda qatnashishingiz mumkin.\n" +
                  "Quyidagi menyudan kerakli konkursni tanlang:",
                { parse_mode: "Markdown" },
              );

              await BotScenes.showMainMenu({
                reply: (text, options) =>
                  this.bot.telegram.sendMessage(userId, text, options),
              });
            } catch (error) {
              console.error("Qayta obuna xabarini yuborishda xatolik:", error);
            }
          }
        }
      } catch (error) {
        console.error("Chat member update error:", error);
      }
    });
  }

  async start() {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      await this.bot.launch({
        dropPendingUpdates: true,
        allowedUpdates: [
          "message",
          "callback_query",
          "chat_member",
          "my_chat_member",
          "chat_join_request",
        ],
      });

      const botInfo = await this.bot.telegram.getMe();
      console.log(`🤖 Bot: @${botInfo.username}`);

      // Botning kanallarga kirishini tekshirish
      await DatabaseService.checkBotChannelsAccess(this.bot.telegram);

      console.log(`👑 Adminlar: ${CONFIG.ADMIN_IDS.join(", ")}`);
      console.log(`📊 Kanallar: ${CONFIG.REQUIRED_CHANNELS.length} ta`);
      console.log(
        `📱 Sovg'alar: ${CONFIG.CONTESTS.IPHONE.prize_count} iPhone, ${CONFIG.CONTESTS.REDMI.prize_count} Redmi, ${CONFIG.CONTESTS.GENTRA.prize_count} Gentra`,
      );
      console.log("🚀 Bot faol va ishlamoqda...");

      // Periodic subscription check
      setInterval(async () => {
        try {
          console.log("🔄 Foydalanuvchilarning obuna holati tekshirilmoqda...");
          const users = await User.find({
            isSubscribed: true,
            lastActivity: {
              $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          }).limit(100);

          for (const user of users) {
            try {
              await DatabaseService.checkAndUpdateSubscription(
                this.bot.telegram,
                user.userId,
              );
            } catch (error) {
              console.error(
                `User ${user.userId} tekshirishda xatolik:`,
                error.message,
              );
            }
          }
        } catch (error) {
          console.error("Periodic check error:", error);
        }
      }, CONFIG.SETTINGS.subscription_check_interval);
    } catch (error) {
      console.error("❌ Botni ishga tushirishda xatolik:", error);
      throw error;
    }
  }

  async stop() {
    try {
      await this.bot.stop();
      await mongoose.connection.close();
      console.log("👋 Bot to'xtatildi");
    } catch (error) {
      console.error("Botni to'xtatishda xatolik:", error);
    }
  }
}

// ============================
// 7. MAIN EXECUTION
// ============================
async function main() {
  try {
    const bot = new SenatorBot();

    // Handle graceful shutdown
    process.once("SIGINT", () => {
      console.log("🛑 SIGINT received, shutting down...");
      bot
        .stop()
        .then(() => {
          console.log("👋 Bot stopped gracefully");
          process.exit(0);
        })
        .catch((error) => {
          console.error("❌ Error during shutdown:", error);
          process.exit(1);
        });
    });

    process.once("SIGTERM", () => {
      console.log("🛑 SIGTERM received, shutting down...");
      bot
        .stop()
        .then(() => {
          console.log("👋 Bot stopped gracefully");
          process.exit(0);
        })
        .catch((error) => {
          console.error("❌ Error during shutdown:", error);
          process.exit(1);
        });
    });

    // Start the bot
    await bot.start();

    console.log("🚀 Bot started successfully with enhanced error handling");
  } catch (error) {
    console.error("❌ Botni ishga tushirishda og'ir xatolik:", error);
    Utils.logToFile("error", "Bot startup error", {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

// Start the application
if (require.main === module) {
  main();
}

// Export for testing
module.exports = {
  SenatorBot,
  DatabaseService,
  Utils,
  CONFIG,
  User,
  Winner,
  Log,
  Notification,
};
