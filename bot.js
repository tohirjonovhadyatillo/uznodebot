"use strict";

/* ============================
   1) IMPORTS & CONFIG
============================ */
const { Telegraf, Markup, Scenes, session } = require("telegraf");
const mongoose = require("mongoose");
const crypto = require("crypto");
const fs = require("fs").promises;
const path = require("path");

require("dotenv").config();

const CONFIG = {
  BOT_TOKEN: process.env.BOT_TOKEN,

  MONGODB_URI: process.env.MONGODB_URI,
  MONGODB_OPTIONS: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000,
    maxPoolSize: 10,
    minPoolSize: 1,
  },

  ADMIN_IDS: process.env.ADMIN_IDS
    ? process.env.ADMIN_IDS.split(",").map((id) => parseInt(id.trim(), 10))
    : [],

  // Majburiy obuna kanallari (public username)
  REQUIRED_CHANNELS: [
    {
      id: "@SENATOR_PUBGM",
      name: "1-SHART",
      url: "https://t.me/SENATOR_PUBGM",
      type: "public",
      username: "@SENATOR_PUBGM",
    },
    {
      id: "@SENATOR_yohohobet",
      name: "2-SHART",
      url: "https://t.me/senator_yohohobet",
      type: "public",
      username: "@SENATOR_yohohobet",
    },
    {
      id: "@senatorkuponchik",
      name: "3-SHART",
      url: "https://t.me/senatorkuponchik",
      type: "public",
      username: "@senatorkuponchik",
    },
    {
      id: "@SENATORKUPON",
      name: "4-SHART",
      url: "https://t.me/SENATORKUPON",
      type: "public",
      username: "@SENATORKUPON",
    },
    {
      id: "@senatorazart",
      name: "5-SHART",
      url: "https://t.me/senatorazart",
      type: "public",
      username: "@senatorazart",
    },
    {
      id: "@senatorlive",
      name: "6-SHART",
      url: "https://t.me/SENATORLIVE",
      type: "public",
      username: "@senatorlive",
    },
    {
      id: "@senator_efir",
      name: "7-SHART",
      url: "https://t.me/SENATOR_EFIR",
      type: "public",
      username: "@senator_efir",
    },
  ],

  CONTESTS: {
    IPHONE: {
      name: "iPhone 17 Pro Max",
      prize_count: 5,
      site_url: "https://t.me/senatorapk",
      promo_code: "SENATOR",
      description: "5 ta iPhone 17 Pro Max telefon sovg'a qilinadi!",
      rules: ["@senatorapk telegram kanalidagi istalgan kantoradan ro'yxatdan o'ting", "Promokod: SENATOR", "ID raqamingizni oling va botga yuboring"],
      button_text: "📱 iPhone 17 Pro Max",
      emoji: "📱",
    },
    REDMI: {
      name: "Redmi Smartphone",
      prize_count: 10,
      site_url: "https://t.me/senatorapk",
      promo_code: "SENATOR",
      description: "10 ta Redmi telefon sovg'a qilinadi!",
      rules: ["@senatorapk telegram kanalidagi istalgan kantoradan ro'yxatdan o'ting", "Promokod: SENATOR", "ID raqamingizni oling va botga yuboring"],
      button_text: "📱 Redmi",
      emoji: "📱",
    },
    GENTRA: {
      name: "Chevrolet Gentra",
      prize_count: 1,
      site_url: "https://t.me/senatorapk",
      promo_code: "SENATOR",
      description: "1 ta Chevrolet Gentra avtomobil sovg'a qilinadi!",
      rules: [
        "@senatorapk telegram kanalidagi istalgan kantoradan ro'yxatdan o'ting",
        "Promokod: SENATOR",
        "Avtomobil uchun ariza to'ldiring",
        "ID raqamingizni oling",
      ],
      button_text: "🚗 Chevrolet Gentra",
      emoji: "🚗",
    },
  },

  SETTINGS: {
    subscription_check_interval: 300000,
    max_retries: 3,
    request_timeout: 10000,
    cache_duration: 300000,
    maintenance_mode: false,
    debug_mode: process.env.NODE_ENV === "development",

    broadcast_batch_size: 15,
    broadcast_delay: 1500,
  },

  PATHS: {
    logs: "./logs",
    backups: "./backups",
    temp: "./temp",
  },
};

if (!CONFIG.BOT_TOKEN || !CONFIG.MONGODB_URI) {
  console.error("❌ .env da BOT_TOKEN va MONGODB_URI bo‘lishi shart!");
  process.exit(1);
}

/* ============================
   2) DATABASE MODELS
============================ */
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
        selectedChannel: String, // Tanlangan kanal
      },
      redmi: {
        participated: { type: Boolean, default: false },
        participantId: { type: String, sparse: true },
        participationDate: Date,
        verified: { type: Boolean, default: false },
        verificationDate: Date,
        selectedChannel: String, // Tanlangan kanal
      },
      gentra: {
        participated: { type: Boolean, default: false },
        participantId: { type: String, sparse: true },
        participationDate: Date,
        verified: { type: Boolean, default: false },
        verificationDate: Date,
        selectedChannel: String, // Tanlangan kanal
      },
    },

    participationCount: { type: Number, default: 0 },
    lastActivity: Date,

    ipAddress: String,
    userAgent: String,
    isBlocked: { type: Boolean, default: false },
    blockReason: String,
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

userSchema.virtual("fullName").get(function () {
  return `${this.firstName || ""} ${this.lastName || ""}`.trim();
});

const User = mongoose.model("User", userSchema);

const winnerSchema = new mongoose.Schema(
  {
    contestType: { type: String, enum: ["iphone", "redmi", "gentra"], required: true, index: true },
    userId: { type: Number, required: true, index: true },
    userInfo: {
      telegramId: Number,
      username: String,
      firstName: String,
      lastName: String,
    },
    participantId: { type: String, required: true },
    selectedChannel: String, // Tanlangan kanal
    prizeNumber: { type: Number, required: true },
    selectedBy: { adminId: Number, adminUsername: String },
    selectionMethod: { type: String, enum: ["random", "manual", "system"], default: "random" },

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
  },
  { timestamps: true }
);

const Winner = mongoose.model("Winner", winnerSchema);

const logSchema = new mongoose.Schema({
  level: { type: String, enum: ["error", "warn", "info", "debug"], required: true, index: true },
  source: { type: String, enum: ["bot", "admin", "system", "database", "api"], required: true },
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

  status: { type: String, enum: ["pending", "sending", "completed", "failed"], default: "pending" },

  createdAt: { type: Date, default: Date.now, index: true },
});

const Notification = mongoose.model("Notification", notificationSchema);

/* ============================
   3) UTILS
============================ */
class Utils {
  static generateId() {
    return crypto.randomBytes(16).toString("hex");
  }

  static formatDate(date, format = "full") {
    const d = new Date(date);
    const options = {
      full: { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" },
      date: { year: "numeric", month: "long", day: "numeric" },
      time: { hour: "2-digit", minute: "2-digit" },
    };
    return d.toLocaleDateString("uz-UZ", options[format] || options.full);
  }

  static async safeEditMessageText(ctx, text, extra = {}) {
    try {
      return await ctx.editMessageText(text, extra);
    } catch (error) {
      if (error?.description && error.description.includes("message is not modified")) {
        console.log("ℹ️ Message is not modified - ignored");
        return null;
      }
      throw error;
    }
  }

  static async safeApproveChatJoinRequest(telegrafBot, chatId, userId) {
    try {
      const chatIdStr = String(chatId);
      const userIdNum = parseInt(userId, 10);
      if (isNaN(userIdNum) || userIdNum <= 0) return false;
      return await telegrafBot.telegram.approveChatJoinRequest(chatIdStr, userIdNum);
    } catch (error) {
      if (
        error?.description &&
        (error.description.includes("invalid user_id") ||
          error.description.includes("CHAT_ID_INVALID") ||
          error.description.includes("USER_ID_INVALID"))
      ) {
        console.log(`⚠️ Join request error ignored: ${error.description}`);
        return false;
      }
      console.error("❌ Approve join request error:", error.message);
      throw error;
    }
  }

  static async safeDeclineChatJoinRequest(telegrafBot, chatId, userId) {
    try {
      const chatIdStr = String(chatId);
      const userIdNum = parseInt(userId, 10);
      if (isNaN(userIdNum) || userIdNum <= 0) return false;
      return await telegrafBot.telegram.declineChatJoinRequest(chatIdStr, userIdNum);
    } catch (error) {
      if (
        error?.description &&
        (error.description.includes("invalid user_id") ||
          error.description.includes("CHAT_ID_INVALID") ||
          error.description.includes("USER_ID_INVALID"))
      ) {
        console.log(`⚠️ Decline join request error ignored: ${error.description}`);
        return false;
      }
      console.error("❌ Decline join request error:", error.message);
      throw error;
    }
  }

  static async retryOperation(operation, maxRetries = 3, delay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (error?.response?.error_code === 400) {
          console.log(`⚠️ 400 error, retry yo‘q: ${error.description || error.message}`);
          throw error;
        }
        if (i === maxRetries - 1) throw error;
        console.log(`🔄 Retry ${i + 1}/${maxRetries}: ${error.message}`);
        await new Promise((r) => setTimeout(r, delay * (i + 1)));
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
    const specialChars = ["_", "*", "[", "]", "(", ")", "~", "`", ">", "#", "+", "-", "=", "|", "{", "}", ".", "!"];
    let out = String(text ?? "");
    for (const ch of specialChars) {
      out = out.replace(new RegExp(`\\${ch}`, "g"), `\\${ch}`);
    }
    return out;
  }

  static async sendMessageWithRetry(telegram, chatId, text, options = {}) {
    try {
      return await telegram.sendMessage(chatId, text, options);
    } catch (error) {
      if (error?.response?.error_code === 429) {
        const retryAfter = error.response.parameters?.retry_after || 1;
        await new Promise((r) => setTimeout(r, retryAfter * 1000));
        return telegram.sendMessage(chatId, text, options);
      }
      throw error;
    }
  }
}

/* ============================
   4) DATABASE SERVICE
============================ */
class DatabaseService {
  static async initialize() {
    try {
      console.log("🔗 MongoDB ga ulanmoqda...");
      await mongoose.connect(CONFIG.MONGODB_URI, CONFIG.MONGODB_OPTIONS);

      mongoose.connection.on("connected", () => {
        console.log("✅ MongoDB ulandi");
        Utils.logToFile("info", "MongoDB connected");
      });

      mongoose.connection.on("error", (err) => {
        console.error("❌ MongoDB error:", err);
        Utils.logToFile("error", "MongoDB connection error", { error: err.message });
      });

      mongoose.connection.on("disconnected", () => {
        console.warn("⚠️ MongoDB disconnected");
        Utils.logToFile("warn", "MongoDB disconnected");
      });

      process.on("SIGINT", async () => {
        await mongoose.connection.close();
        console.log("MongoDB connection closed");
        process.exit(0);
      });

      return mongoose.connection;
    } catch (error) {
      console.error("❌ MongoDB ulanib bo‘lmadi:", error);
      Utils.logToFile("error", "MongoDB connection failed", { error: error.message });
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
      console.error("❌ MongoDB qayta ulanish xatosi:", error);
      return false;
    }
  }

  static async findOrCreateUser(ctx) {
    return Utils.retryOperation(async () => {
      const { id, username, first_name, last_name, language_code } = ctx.from;

      let user = await User.findOne({ userId: id });
      if (!user) {
        user = new User({
          userId: id,
          telegramId: id,
          username,
          firstName: first_name,
          lastName: last_name,
          languageCode: language_code,
          ipAddress: ctx.ip,
          userAgent: ctx.telegram?.update_id ? "Telegram" : "Web",
          isSubscribed: false,
          contests: { iphone: { participated: false }, redmi: { participated: false }, gentra: { participated: false } },
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

        console.log(`👤 Yangi user: ${username || first_name} (${id})`);
      } else {
        user.username = username;
        user.firstName = first_name;
        user.lastName = last_name;
        user.lastActivity = new Date();
        await user.save();
      }
      return user;
    });
  }

  static async checkAndUpdateSubscription(telegram, userId) {
    return Utils.retryOperation(async () => {
      const user = await User.findOne({ userId });
      if (!user) return { isSubscribed: false, notSubscribed: CONFIG.REQUIRED_CHANNELS };

      if (
        user.subscriptionCheckedAt &&
        Date.now() - user.subscriptionCheckedAt.getTime() < CONFIG.SETTINGS.cache_duration &&
        user.isSubscribed
      ) {
        return { isSubscribed: true, notSubscribed: [] };
      }

      const notSubscribed = [];
      const subscribedChannels = [];

      for (const channel of CONFIG.REQUIRED_CHANNELS) {
        let isMember = false;
        try {
          const member = await telegram.getChatMember(channel.id, userId);
          isMember = !(member.status === "left" || member.status === "kicked");
        } catch (e) {
          console.log(`Kanal tekshirish xatosi (${channel.name}):`, e.message);
        }

        if (isMember) {
          subscribedChannels.push({
            channelId: channel.id,
            channelName: channel.name,
            subscribedAt: new Date(),
            isAdmin: false,
          });
        } else {
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
        userId,
        message: "Obuna holati tekshirildi",
        details: { isSubscribed, channels: subscribedChannels.length },
      });

      return { isSubscribed, notSubscribed };
    });
  }

  static async checkBotChannelsAccess(telegram) {
    console.log("🔍 Bot kanallarga kirish huquqi tekshirilyapti...");
    for (const channel of CONFIG.REQUIRED_CHANNELS) {
      try {
        const chat = await telegram.getChat(channel.id);
        console.log(`✅ ${channel.name}: ${chat.type}`);
      } catch (error) {
        console.error(`❌ ${channel.name} access xato:`, error.message);
        console.log(`⚠️ Botni ${channel.name} kanaliga admin qiling!`);
      }
    }
  }

  static async participateInContest(userId, contestType, participantId, selectedChannel) {
    return Utils.retryOperation(async () => {
      const user = await User.findOne({ userId });
      if (!user) throw new Error("Foydalanuvchi topilmadi");

      if (user.contests[contestType]?.participated) {
        throw new Error("Siz allaqachon qatnashgansiz");
      }

      const existingUser = await User.findOne({
        [`contests.${contestType}.participantId`]: participantId,
        userId: { $ne: userId },
      });

      if (existingUser) {
        throw new Error("Bu ID allaqachon boshqa foydalanuvchi tomonidan kiritilgan");
      }

      user.contests[contestType] = {
        participated: true,
        participantId,
        participationDate: new Date(),
        verified: false,
        selectedChannel: selectedChannel,
      };

      user.participationCount += 1;
      user.lastActivity = new Date();
      await user.save();

      await Log.create({
        level: "info",
        source: "bot",
        action: "contest_participation",
        userId,
        contestType,
        message: "Konkursga qatnashish",
        details: { contestType, participantId, selectedChannel },
      });

      console.log(`🎯 User ${userId} ${contestType} qatnashdi, kanal: ${selectedChannel}`);
      return user;
    });
  }

  static async handleUserLeftChannel(channelId, userId) {
    try {
      const user = await User.findOne({ userId });
      if (!user) return null;

      user.subscribedChannels = user.subscribedChannels.filter((c) => c.channelId !== channelId);
      user.isSubscribed = false;
      user.lastActivity = new Date();
      await user.save();

      const channel = CONFIG.REQUIRED_CHANNELS.find((c) => c.id === channelId);

      await Log.create({
        level: "warn",
        source: "system",
        action: "user_left_channel",
        userId,
        message: "Foydalanuvchi kanaldan chiqdi",
        details: { channelId },
      });

      if (channel) {
        return { shouldNotify: true, channelName: channel.name, user };
      }
      return null;
    } catch (error) {
      console.error("User left channel handle xato:", error);
      return null;
    }
  }

  static async selectWinner(contestType, adminId, adminUsername) {
    return Utils.retryOperation(async () => {
      const existingWinnersCount = await Winner.countDocuments({ contestType });
      const maxWinners = CONFIG.CONTESTS[contestType.toUpperCase()].prize_count;

      if (existingWinnersCount >= maxWinners) {
        throw new Error(`Barcha ${maxWinners} ta g‘olib allaqachon aniqlangan`);
      }

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

      if (participants.length === 0) throw new Error("G‘olib aniqlash uchun yangi ishtirokchi yo‘q");

      const winner = participants[Math.floor(Math.random() * participants.length)];

      const winnerRecord = new Winner({
        contestType,
        userId: winner.userId,
        userInfo: {
          telegramId: winner.userId,
          username: winner.username,
          firstName: winner.firstName,
          lastName: winner.lastName,
        },
        participantId: winner.contests[contestType].participantId,
        selectedChannel: winner.contests[contestType].selectedChannel,
        prizeNumber: existingWinnersCount + 1,
        selectedBy: { adminId, adminUsername },
        selectionMethod: "random",
        verificationCode: Utils.generateId().substring(0, 8).toUpperCase(),
        selectedAt: new Date(),
      });

      await winnerRecord.save();

      await Log.create({
        level: "info",
        source: "admin",
        action: "winner_selected",
        adminId,
        contestType,
        message: "Yangi g‘olib aniqlandi",
        details: { winnerId: winner.userId, contestType, prizeNumber: existingWinnersCount + 1 },
      });

      console.log(`🏆 Winner: ${winner.username || winner.firstName} (${winner.userId})`);
      return winnerRecord;
    });
  }

  static async getStatistics() {
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
      User.countDocuments({ "contests.iphone.participated": true, isSubscribed: true }),
      User.countDocuments({ "contests.redmi.participated": true, isSubscribed: true }),
      User.countDocuments({ "contests.gentra.participated": true, isSubscribed: true }),
      Winner.countDocuments({ contestType: "iphone" }),
      Winner.countDocuments({ contestType: "redmi" }),
      Winner.countDocuments({ contestType: "gentra" }),
      User.countDocuments({ createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } }),
      User.countDocuments({ lastActivity: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
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
  }

  static async getWinners(contestType) {
    return Winner.find({ contestType }).sort({ selectedAt: -1 }).limit(50);
  }

  static async broadcastMessage(telegram, adminMessage, filters = {}) {
    let notification;

    try {
      await this.checkConnection();

      let query = {};
      if (filters.subscribed !== undefined) query.isSubscribed = filters.subscribed;
      if (filters.participatedIn) query[`contests.${filters.participatedIn}.participated`] = true;
      if (filters.minParticipationCount) query.participationCount = { $gte: filters.minParticipationCount };
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

      console.log(`📤 Broadcast: ${users.length} ta user`);

      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);

        const batchPromises = batch.map(async (u) => {
          const chatId = String(u.userId);
          try {
            if (adminMessage.poll) {
              const poll = adminMessage.poll;
              await telegram.sendPoll(chatId, poll.question, poll.options, {
                is_anonymous: poll.is_anonymous || false,
                type: poll.type || "regular",
                allows_multiple_answers: poll.allows_multiple_answers || false,
                correct_option_id: poll.correct_option_id,
                explanation: poll.explanation,
                open_period: poll.open_period,
                close_date: poll.close_date,
              });
            } else if (adminMessage.photo) {
              await telegram.sendPhoto(chatId, adminMessage.photo[adminMessage.photo.length - 1].file_id, {
                caption: adminMessage.caption,
                parse_mode: adminMessage.parse_mode,
                caption_entities: adminMessage.caption_entities,
              });
            } else if (adminMessage.video) {
              await telegram.sendVideo(chatId, adminMessage.video.file_id, {
                caption: adminMessage.caption,
                parse_mode: adminMessage.parse_mode,
                caption_entities: adminMessage.caption_entities,
              });
            } else if (adminMessage.document) {
              await telegram.sendDocument(chatId, adminMessage.document.file_id, {
                caption: adminMessage.caption,
                parse_mode: adminMessage.parse_mode,
                caption_entities: adminMessage.caption_entities,
              });
            } else if (adminMessage.audio) {
              await telegram.sendAudio(chatId, adminMessage.audio.file_id, {
                caption: adminMessage.caption,
                parse_mode: adminMessage.parse_mode,
                caption_entities: adminMessage.caption_entities,
              });
            } else if (adminMessage.voice) {
              await telegram.sendVoice(chatId, adminMessage.voice.file_id, {
                caption: adminMessage.caption,
                parse_mode: adminMessage.parse_mode,
                caption_entities: adminMessage.caption_entities,
              });
            } else if (adminMessage.sticker) {
              await telegram.sendSticker(chatId, adminMessage.sticker.file_id);
            } else {
              await telegram.sendMessage(chatId, adminMessage.text, {
                parse_mode: adminMessage.parse_mode,
                entities: adminMessage.entities,
                disable_web_page_preview: adminMessage.disable_web_page_preview,
              });
            }

            successful++;
            await new Promise((r) => setTimeout(r, 100));
          } catch (error) {
            failed++;

            const errorMessage = error.message || String(error);
            if (
              errorMessage.includes("bot was blocked") ||
              errorMessage.includes("Forbidden") ||
              errorMessage.includes("user is deactivated") ||
              error.code === 403 ||
              error?.response?.error_code === 403
            ) {
              await User.updateOne(
                { userId: u.userId },
                { $set: { isBlocked: true, isActive: false, blockReason: "Bot blocked by user" } }
              ).catch(() => {});
              console.log(`❌ ${u.userId}: blocked`);
            } else if (
              errorMessage.includes("Too Many Requests") ||
              error.code === 429 ||
              error?.response?.error_code === 429
            ) {
              const retryAfter = error?.response?.parameters?.retry_after || 2;
              console.log(`⚠️ 429: ${u.userId} -> ${retryAfter}s`);
              await new Promise((r) => setTimeout(r, retryAfter * 1000));

              try {
                await telegram.sendMessage(String(u.userId), adminMessage.text, {
                  parse_mode: adminMessage.parse_mode,
                  entities: adminMessage.entities,
                  disable_web_page_preview: adminMessage.disable_web_page_preview,
                });
                successful++;
                failed--;
                console.log(`✅ retry ok: ${u.userId}`);
              } catch (e2) {
                console.log(`❌ retry fail: ${u.userId}`);
              }
            } else {
              console.log(`❌ ${u.userId}: ${errorMessage}`);
            }

            await Utils.logToFile("error", `Broadcast xatosi: ${u.userId}`, {
              error: errorMessage,
              code: error.code,
            });
          }
        });

        await Promise.allSettled(batchPromises);
        await this.checkConnection();

        notification.totalSent = Math.min(i + batchSize, users.length);
        notification.successful = successful;
        notification.failed = failed;
        await notification.save();

        if (i + batchSize < users.length) {
          await new Promise((r) => setTimeout(r, delayBetweenBatches));
        }
      }

      notification.status = "completed";
      notification.completedAt = new Date();
      await notification.save();

      console.log(`✅ Broadcast tugadi: ${successful} ok, ${failed} fail`);

      return { total: users.length, successful, failed };
    } catch (error) {
      console.error("📤 Broadcast xato:", error);
      if (notification) {
        notification.status = "failed";
        await notification.save().catch(() => {});
      }
      throw error;
    }
  }
}

/* ============================
   5) BOT SCENES
============================ */
class BotScenes {
  static createContestScene(contestType) {
    const contest = CONFIG.CONTESTS[contestType.toUpperCase()];
    const scene = new Scenes.BaseScene(contestType.toLowerCase());

    scene.enter(async (ctx) => {
      try {
        const userId = ctx.from.id;

        const user = await DatabaseService.findOrCreateUser(ctx);

        const subscription = await DatabaseService.checkAndUpdateSubscription(ctx.telegram, userId);

        if (!subscription.isSubscribed) {
          await ctx.reply(
            "📢 *ILTIMOS, KANALLARGA OBUNA BO'LING!*\n\n" +
              "Botdan to'liq foydalanish uchun quyidagi kanallarga obuna bo'lishingiz kerak:",
            { parse_mode: "Markdown" }
          );
          await this.showChannelButtons(ctx, subscription.notSubscribed);
          return ctx.scene.leave();
        }

        const hasParticipated = user.contests[contestType.toLowerCase()]?.participated || false;

        if (hasParticipated) {
          const participantId = user.contests[contestType.toLowerCase()]?.participantId;
          const selectedChannel = user.contests[contestType.toLowerCase()]?.selectedChannel;
          await ctx.reply(
            "ℹ️ *SIZ ALLAQACHON QATNASHGANSIZ!*\n\n" +
              "Siz ushbu konkursga allaqachon qatnashgansiz.\n" +
              `📝 Sizning ID raqamingiz: ${participantId || "Noma'lum"}\n` +
              `📢 Tanlangan kanal: ${selectedChannel || "Noma'lum"}`,
            { parse_mode: "Markdown" }
          );
          return ctx.scene.leave();
        }

        const contestInfo =
          `${contest.emoji} *${contest.name} KONKURSI*\n\n` +
          `🎁 ${contest.description}\n\n` +
          `🎯 *Qatnashish shartlari:*\n` +
          contest.rules.map((rule, i) => `${i + 1}. ${rule}`).join("\n") +
          `\n\n` +
          `🔗 *Kanal:* ${contest.site_url}\n` +
          `🔑 *Promokod:* \`${contest.promo_code}\`\n\n` +
          `ID ni yuborish uchun quyidagi tugmani bosing:`;

        await ctx.reply(Utils.escapeMarkdown(contestInfo), {
          parse_mode: "MarkdownV2",
          ...Markup.inlineKeyboard([
            [Markup.button.callback("✅ Qatnashish", `participate_${contestType.toLowerCase()}`)],
            [Markup.button.callback("❌ Bekor qilish", `cancel_${contestType.toLowerCase()}`)],
          ]),
        });
      } catch (error) {
        console.error(`${contestType} scene enter error:`, error);
        await ctx.reply("⚠️ Botda vaqtinchalik xatolik yuz berdi. Keyinroq urinib ko'ring.", {
          parse_mode: "Markdown",
        });
        ctx.scene.leave();
      }
    });

    scene.action(`participate_${contestType.toLowerCase()}`, async (ctx) => {
      try {
        ctx.scene.state = ctx.scene.state || {};
        ctx.scene.state.waitingForChannel = true;

        // 7 ta kanal uchun tugmalar yaratish
        const channelButtons = CONFIG.REQUIRED_CHANNELS.map((channel, index) => {
          return [Markup.button.callback(`${index + 1}-SHART`, `channel_${index + 1}`)];
        });

        await Utils.safeEditMessageText(
          ctx,
          Utils.escapeMarkdown(
            "📢 *KANTORANI TANLANG:*\n\n" +
              "Iltimos, qaysi kantora orqali qatnashayotganingizni tanlang:\n\n" +
              "1️⃣ Xparibet 🔥\n" +
              "2️⃣ Yohohobet 💸\n" +
              "3️⃣ Linebet 😎\n" +
              "4️⃣ BetWinner 🏆\n" +
              "5️⃣ DB bet ✅\n" +
              "6️⃣ Megaparibet ⚡️\n" +
              "7️⃣ Melbet 🎉"
          ),
          { 
            parse_mode: "MarkdownV2",
            ...Markup.inlineKeyboard(channelButtons)
          }
        );
      } catch (error) {
        console.error(`${contestType} participation error:`, error);
        await ctx.reply("⚠️ Botda vaqtinchalik xatolik yuz berdi. Keyinroq urinib ko'ring.", {
          parse_mode: "Markdown",
        });
        ctx.scene.leave();
      }
    });

    // Kanal tanlash uchun action handler
    for (let i = 1; i <= 7; i++) {
      scene.action(`channel_${i}`, async (ctx) => {
        try {
          ctx.scene.state.selectedChannel = `${i}-SHART`;
          ctx.scene.state.waitingForChannel = false;
          ctx.scene.state.waitingForId = true;

          await Utils.safeEditMessageText(
            ctx,
            Utils.escapeMarkdown(
              `📢 *SIZ ${i}-SHART TANLADINGIZ*\n\n` +
              "📝 *ID raqamingizni yuboring:*\n\n" +
              "Iltimos, saytdan olingan ID raqamingizni yuboring.\n" +
              "ID qanday formatda bo‘lsa ham qabul qilinadi.\n\n" +
              "*Eslatma:* ID ni yuborganingizdan keyin keyinchalik o‘zgartirib bo‘lmaydi!"
            ),
            { parse_mode: "MarkdownV2" }
          );
        } catch (error) {
          console.error(`Channel ${i} selection error:`, error);
          await ctx.reply("⚠️ Botda vaqtinchalik xatolik yuz berdi. Keyinroq urinib ko'ring.", {
            parse_mode: "Markdown",
          });
          ctx.scene.leave();
        }
      });
    }

    // ID qabul qilish
    scene.on("text", async (ctx) => {
      if (!ctx.scene?.state?.waitingForId) return;

      try {
        const userId = ctx.from.id;
        const participantIdRaw = (ctx.message?.text || "").trim();
        const selectedChannel = ctx.scene.state.selectedChannel;

        if (!participantIdRaw) {
          await ctx.reply("❌ ID bo‘sh bo‘lmasligi kerak. Qaytadan yuboring.");
          return;
        }
        if (participantIdRaw.length > 64) {
          await ctx.reply("❌ ID juda uzun. Qisqaroq yuboring.");
          return;
        }

        const validId = participantIdRaw;

        await DatabaseService.participateInContest(userId, ctx.scene.id, validId, selectedChannel);

        await ctx.reply(
          Utils.escapeMarkdown(
            "🎉 *TABRIKLAYMIZ!*\n\n" +
              "Siz konkursga muvaffaqiyatli qatnashdingiz!\n" +
              `📝 Sizning ID raqamingiz: \`${validId}\`\n` +
              `📢 Tanlangan kanal: ${selectedChannel}\n\n` +
              "🏆 G'oliblar adminlar tomonidan aniqlanadi va sizga xabar beriladi.\n" +
              "🔔 Kutib turing, natijalar yaqin orada e'lon qilinadi!\n\n" +
              "⚠️ *Diqqat:* Agar kanallardan chiqsangiz, konkursdan avtomatik chetlashtirilasiz!"
          ),
          { parse_mode: "MarkdownV2" }
        );

        ctx.scene.state.waitingForId = false;
        await BotScenes.showMainMenu(ctx);
        ctx.scene.leave();
      } catch (error) {
        console.error(`${contestType} ID qayta ishlash xatosi:`, error);
        await ctx.reply(Utils.escapeMarkdown(error.message || "❌ Xatolik yuz berdi."), {
          parse_mode: "MarkdownV2",
        });
        ctx.scene.state.waitingForId = false;
        ctx.scene.leave();
      }
    });

    scene.on("message", async (ctx) => {
      if (!ctx.scene?.state?.waitingForId) return;
      if (ctx.message?.text) return;
      await ctx.reply("❌ Iltimos, faqat ID raqamini yuboring!", { parse_mode: "Markdown" });
    });

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
        if (!CONFIG.ADMIN_IDS.includes(ctx.from.id)) return ctx.reply("❌ Siz admin emassiz!");

        await ctx.reply("👨‍💻 *ADMIN PANEL*\n\nQuyidagilardan birini tanlang:", {
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard([
            [Markup.button.callback("📊 Statistika", "admin_stats")],
            [Markup.button.callback("📣 Xabar yuborish", "admin_broadcast")],
            [Markup.button.callback("🏆 G'oliblar", "admin_winners")],
            [Markup.button.callback("🚪 Chiqish", "exit_admin")],
          ]),
        });
      } catch (error) {
        console.error("Admin scene enter error:", error);
        await ctx.reply("⚠️ Xatolik. Keyinroq urinib ko‘ring.", { parse_mode: "Markdown" });
        ctx.scene.leave();
      }
    });

    scene.action("admin_stats", async (ctx) => {
      try {
        const stats = await DatabaseService.getStatistics();
        
        // Kanal bo'yicha statistika
        const channelStats = [];
        for (let i = 1; i <= 7; i++) {
          const count = await User.countDocuments({
            $or: [
              { "contests.iphone.selectedChannel": `${i}-SHART` },
              { "contests.redmi.selectedChannel": `${i}-SHART` },
              { "contests.gentra.selectedChannel": `${i}-SHART` }
            ]
          });
          channelStats.push(`${i}-SHART: ${count} ta`);
        }

        await Utils.safeEditMessageText(
          ctx,
          `📊 *BOT STATISTIKASI*\n\n` +
            `👥 *Jami:* ${stats.totalUsers}\n` +
            `🚫 *Bloklangan:* ${stats.blockedUsers}\n` +
            `📈 *Bugun qo‘shilgan:* ${stats.todayUsers}\n` +
            `🔥 *24 soat aktiv:* ${stats.activeUsers}\n` +
            `✅ *Obuna:* ${stats.subscribedUsers}\n\n` +
            `🏆 *iPhone qatnashchilari:* ${stats.iphoneParticipants}\n` +
            `🏆 *Redmi qatnashchilari:* ${stats.redmiParticipants}\n` +
            `🏆 *Gentra qatnashchilari:* ${stats.gentraParticipants}\n\n` +
            `🏆 *iPhone g‘oliblari:* ${stats.iphoneWinners}/${CONFIG.CONTESTS.IPHONE.prize_count}\n` +
            `🏆 *Redmi g‘oliblari:* ${stats.redmiWinners}/${CONFIG.CONTESTS.REDMI.prize_count}\n` +
            `🏆 *Gentra g‘oliblari:* ${stats.gentraWinners}/${CONFIG.CONTESTS.GENTRA.prize_count}\n\n` +
            `📢 *Kanallar bo‘yicha:*\n` +
            channelStats.join("\n") +
            `\n\n🕒 *Yangilandi:* ${Utils.formatDate(new Date(), "time")}`,
          { parse_mode: "Markdown" }
        );
      } catch (error) {
        console.error("Admin stats error:", error);
        await ctx.answerCbQuery("❌ Statistika olishda xatolik!");
      }
    });

    scene.action("admin_winners", async (ctx) => {
      try {
        await Utils.safeEditMessageText(
          ctx,
          "🏆 *G'OLIBLAR* \n\nQaysi konkurs g'oliblarini ko'rmoqchisiz?",
          {
            parse_mode: "Markdown",
            ...Markup.inlineKeyboard([
              [Markup.button.callback("📱 iPhone", "winners_iphone")],
              [Markup.button.callback("📱 Redmi", "winners_redmi")],
              [Markup.button.callback("🚗 Gentra", "winners_gentra")],
              [Markup.button.callback("🔙 Orqaga", "back_to_admin")],
            ]),
          }
        );
      } catch (error) {
        console.error("Admin winners error:", error);
        await ctx.answerCbQuery("❌ Xatolik!");
      }
    });

    scene.action("winners_iphone", async (ctx) => ctx.scene.enter("winners", { contestType: "iphone" }));
    scene.action("winners_redmi", async (ctx) => ctx.scene.enter("winners", { contestType: "redmi" }));
    scene.action("winners_gentra", async (ctx) => ctx.scene.enter("winners", { contestType: "gentra" }));

    scene.action("admin_broadcast", async (ctx) => {
      try {
        await Utils.safeEditMessageText(ctx, "📣 *XABAR YUBORISH*\n\nBoshlash uchun tanlang:", {
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard([
            [Markup.button.callback("📢 Hammaga yuborish", "broadcast_all")],
            [Markup.button.callback("🔙 Orqaga", "back_to_admin")],
          ]),
        });
      } catch (error) {
        console.error("Broadcast menu error:", error);
        await ctx.answerCbQuery("❌ Xatolik!");
      }
    });

    scene.action("broadcast_all", async (ctx) => {
      try {
        if (!CONFIG.ADMIN_IDS.includes(ctx.from.id)) return;

        ctx.session.broadcast = { enabled: true, filters: {} };

        await ctx.reply(
          "✅ Endi yubormoqchi bo‘lgan xabaringizni yuboring.\n\n" +
            "🟢 Matn / rasm / video / voice / fayl / poll — hammasi bo‘ladi.\n" +
            "❌ Bekor qilish: /cancel",
          { parse_mode: "Markdown" }
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

        if (ctx.message?.text === "/cancel") {
          ctx.session.broadcast = null;
          ctx.session.pendingBroadcast = null;
          return ctx.reply("❌ Broadcasting bekor qilindi.");
        }

        if (ctx.session.broadcast?.enabled) {
          const filters = ctx.session.broadcast.filters || {};

          let query = {};
          if (filters.subscribed !== undefined) query.isSubscribed = filters.subscribed;
          if (filters.participatedIn) query[`contests.${filters.participatedIn}.participated`] = true;
          if (filters.minParticipationCount) query.participationCount = { $gte: filters.minParticipationCount };

          const userCount = await User.countDocuments({ ...query, isBlocked: false, isActive: true });

          if (userCount > 500) {
            await ctx.reply(
              `⚠️ *DIQQAT!*\n\n` +
                `Siz ${userCount} ta foydalanuvchiga xabar yubormoqchisiz.\n\n` +
                `Davom ettirish uchun "✅ Davom ettirish" tugmasini bosing yoki /cancel bosing.`,
              {
                parse_mode: "Markdown",
                ...Markup.inlineKeyboard([
                  [Markup.button.callback("✅ Davom ettirish", "confirm_broadcast")],
                  [Markup.button.callback("❌ Bekor qilish", "cancel_broadcast")],
                ]),
              }
            );

            ctx.session.pendingBroadcast = { message: ctx.message, filters };
            ctx.session.broadcast.enabled = false;
            return;
          }

          await ctx.reply(`🚀 Xabar yuborish boshlandi...\n👥 ${userCount} ta foydalanuvchi`);

          const result = await DatabaseService.broadcastMessage(ctx.telegram, ctx.message, {
            ...filters,
            adminId: ctx.from.id,
            adminUsername: ctx.from.username,
          });

          ctx.session.broadcast = null;

          await ctx.reply(
            `✅ *Xabar yuborish tugadi!*\n\n` +
              `👥 Jami: ${result.total}\n` +
              `✅ Yuborildi: ${result.successful}\n` +
              `❌ Xato: ${result.failed}\n` +
              `📈 %: ${((result.successful / Math.max(result.total, 1)) * 100).toFixed(1)}%`,
            { parse_mode: "Markdown" }
          );
        }
      } catch (error) {
        console.error("Broadcast handler error:", error);
        ctx.session.broadcast = null;
        ctx.session.pendingBroadcast = null;
        await ctx.reply("❌ Xabar yuborishda xatolik yuz berdi.");
      }
    });

    scene.action("confirm_broadcast", async (ctx) => {
      try {
        await ctx.answerCbQuery();
        await ctx.deleteMessage().catch(() => {});

        const pending = ctx.session.pendingBroadcast;
        if (!pending) return ctx.reply("❌ Tasdiq ma'lumotlari topilmadi.");

        await ctx.reply("🚀 Xabar yuborish boshlandi...");

        const result = await DatabaseService.broadcastMessage(ctx.telegram, pending.message, {
          ...pending.filters,
          adminId: ctx.from.id,
          adminUsername: ctx.from.username,
        });

        ctx.session.pendingBroadcast = null;
        ctx.session.broadcast = null;

        await ctx.reply(
          `✅ *Xabar yuborish tugadi!*\n\n` +
            `👥 Jami: ${result.total}\n` +
            `✅ Yuborildi: ${result.successful}\n` +
            `❌ Xato: ${result.failed}\n` +
            `📈 %: ${((result.successful / Math.max(result.total, 1)) * 100).toFixed(1)}%`,
          { parse_mode: "Markdown" }
        );
      } catch (error) {
        console.error("Confirm broadcast error:", error);
        await ctx.reply("❌ Xabar yuborishda xatolik yuz berdi.");
      }
    });

    scene.action("cancel_broadcast", async (ctx) => {
      await ctx.answerCbQuery();
      await ctx.deleteMessage().catch(() => {});
      ctx.session.pendingBroadcast = null;
      ctx.session.broadcast = null;
      await ctx.reply("❌ Broadcasting bekor qilindi.");
    });

    scene.action("back_to_admin", async (ctx) => ctx.scene.reenter());

    scene.action("exit_admin", async (ctx) => {
      await ctx.editMessageText("👋 Admin panelidan chiqildi.").catch(() => {});
      ctx.scene.leave();
    });

    return scene;
  }

  static createWinnersScene() {
    const scene = new Scenes.BaseScene("winners");

    scene.enter(async (ctx) => {
      try {
        const contestType = ctx.scene.state.contestType;
        const winners = await DatabaseService.getWinners(contestType);

        if (winners.length === 0) {
          await ctx.reply(`🏆 *${contestType.toUpperCase()} g'oliblari:*\n\nHozircha g'oliblar yo'q.`, {
            parse_mode: "Markdown",
          });
          return ctx.scene.leave();
        }

        let message = `🏆 *${contestType.toUpperCase()} G'OLIBLARI:*\n\n`;
        winners.forEach((w, i) => {
          message += `${i + 1}. ${w.userInfo.firstName || ""} ${w.userInfo.lastName || ""} (@${w.userInfo.username || "no username"})\n`;
          message += `   📝 ID: ${w.participantId}\n`;
          message += `   📢 Kanal: ${w.selectedChannel || "Noma'lum"}\n`;
          message += `   🎁 Sovg'a: ${w.prizeNumber}\n`;
          message += `   📅 ${Utils.formatDate(w.selectedAt, "date")}\n\n`;
        });

        await ctx.reply(message, { parse_mode: "Markdown" });
        ctx.scene.leave();
      } catch (error) {
        console.error("Winners scene error:", error);
        await ctx.reply("⚠️ Xatolik yuz berdi.");
        ctx.scene.leave();
      }
    });

    return scene;
  }

  static async showMainMenu(ctx) {
    await ctx.reply("🏠 *ASOSIY MENYU*\n\nKonkursni tanlang:", {
      parse_mode: "Markdown",
      ...Markup.keyboard([
        [CONFIG.CONTESTS.IPHONE.button_text],
        [CONFIG.CONTESTS.REDMI.button_text],
        [CONFIG.CONTESTS.GENTRA.button_text],
        ["📋 Konkurs haqida", "🔄 Obunani tekshirish"],
      ])
        .resize()
        .oneTime(),
    });
  }

  static async showChannelButtons(ctx, channels) {
    const buttons = channels.map((ch) => [Markup.button.url(`📢 ${ch.name}`, ch.url)]);
    buttons.push([Markup.button.callback("✅ Obunani tekshirish", "check_subscription")]);

    await ctx.reply(Utils.escapeMarkdown("Botdan to'liq foydalanish uchun quyidagi kanallarga obuna bo'ling:"), {
      parse_mode: "MarkdownV2",
      ...Markup.inlineKeyboard(buttons),
    });
  }
}

/* ============================
   6) MAIN BOT CLASS
============================ */
class SenatorBot {
  constructor() {
    this.bot = new Telegraf(CONFIG.BOT_TOKEN);
    this.scenes = [];
    this.stage = null;
    this.initialized = false;
    this.setupGlobalErrorHandlers();
  }

  setupGlobalErrorHandlers() {
    process.on("unhandledRejection", (reason, promise) => {
      console.error("⚠️ Unhandled Rejection:", reason);
      Utils.logToFile("error", "Unhandled Rejection", { reason: reason?.message || reason, stack: reason?.stack });
    });

    process.on("uncaughtException", (error) => {
      console.error("⚠️ Uncaught Exception:", error);
      Utils.logToFile("error", "Uncaught Exception", { error: error.message, stack: error.stack });
    });

    console.log("✅ Global error handlers initialized");
  }

  async initialize() {
    console.log("🚀 Bot ishga tushyapti...");

    await this.createDirectories();
    await DatabaseService.initialize();

    const iphoneScene = BotScenes.createContestScene("IPHONE");
    const redmiScene = BotScenes.createContestScene("REDMI");
    const gentraScene = BotScenes.createContestScene("GENTRA");
    const adminScene = BotScenes.createAdminScene();
    const winnersScene = BotScenes.createWinnersScene();

    this.scenes = [iphoneScene, redmiScene, gentraScene, adminScene, winnersScene];
    this.stage = new Scenes.Stage(this.scenes);

    this.bot.use(session());
    this.bot.use(this.stage.middleware());

    this.bot.use(async (ctx, next) => {
      try {
        await next();
      } catch (error) {
        console.error("Bot middleware error:", error);
        Utils.logToFile("error", "Bot middleware error", { error: error.message, stack: error.stack });

        try {
          if (ctx.callbackQuery) await ctx.answerCbQuery("⚠️ Xatolik. Keyinroq urinib ko‘ring.");
          else if (ctx.message) await ctx.reply("⚠️ Botda vaqtinchalik xatolik. Keyinroq urinib ko‘ring.");
        } catch (_) {}
      }
    });

    this.bot.use(async (ctx, next) => {
      if (ctx.message || ctx.callbackQuery) await DatabaseService.findOrCreateUser(ctx);
      await next();
    });

    this.registerCommands();
    this.registerActions();
    this.registerEventHandlers();

    this.initialized = true;
    console.log("✅ Bot tayyor!");
  }

  async createDirectories() {
    for (const p of Object.values(CONFIG.PATHS)) {
      await fs.mkdir(p, { recursive: true });
    }
    console.log("📁 Papkalar yaratildi");
  }

  registerCommands() {
    this.bot.start(async (ctx) => {
      try {
        const userId = ctx.from.id;
        const subscription = await DatabaseService.checkAndUpdateSubscription(ctx.telegram, userId);

        if (subscription.notSubscribed.length > 0) {
          await ctx.reply(
            "🎉 *SENATOR KONKURS BOTIGA XUSH KELIBSIZ!*\n\n" +
              "🏆 5 ta iPhone 17 Pro Max\n" +
              "🏆 10 ta Redmi telefon\n" +
              "🏆 1 ta Chevrolet Gentra\n\n" +
              "Avval kanallarga obuna bo‘ling:",
            { parse_mode: "Markdown" }
          );
          await BotScenes.showChannelButtons(ctx, subscription.notSubscribed);
        } else {
          await ctx.reply("✅ *BARCHA KANALLARGA OBUNA BO'LGANSIZ!*\n\nMenyudan tanlang:", {
            parse_mode: "Markdown",
          });
          await BotScenes.showMainMenu(ctx);
        }
      } catch (error) {
        console.error("Start error:", error);
        await ctx.reply("⚠️ Xatolik. Keyinroq urinib ko‘ring.");
      }
    });

    this.bot.command("admin", async (ctx) => {
      if (!CONFIG.ADMIN_IDS.includes(ctx.from.id)) return ctx.reply("❌ Siz admin emassiz!");
      return ctx.scene.enter("admin");
    });

    this.bot.command("help", async (ctx) => {
      await ctx.reply(
        "🏆 *KONKURS HAQIDA*\n\n" +
          "🎁 Sovg'alar:\n" +
          "• 5 ta iPhone 17 Pro Max\n" +
          "• 10 ta Redmi\n" +
          "• 1 ta Gentra\n\n" +
          "⚠️ Diqqat: kanallardan chiqsangiz, avtomatik chetlashtirilasiz!",
        { parse_mode: "Markdown" }
      );
    });

    this.bot.command("stats", async (ctx) => {
      if (!CONFIG.ADMIN_IDS.includes(ctx.from.id)) return ctx.reply("❌ Siz admin emassiz!");
      const stats = await DatabaseService.getStatistics();
      await ctx.reply(
        `📊 Statistika:\n\nJami: ${stats.totalUsers}\nObuna: ${stats.subscribedUsers}\niPhone: ${stats.iphoneParticipants}\nRedmi: ${stats.redmiParticipants}\nGentra: ${stats.gentraParticipants}`
      );
    });
  }

  registerActions() {
    this.bot.action("check_subscription", async (ctx) => {
      try {
        await ctx.answerCbQuery();
        const userId = ctx.from.id;

        const subscription = await DatabaseService.checkAndUpdateSubscription(ctx.telegram, userId);

        if (subscription.notSubscribed.length > 0) {
          await ctx.editMessageText(
            "📢 *ILTIMOS, KANALLARGA OBUNA BO'LING!*\n\nQuyidagilarga obuna bo‘lishingiz kerak:",
            { parse_mode: "Markdown" }
          );
          await BotScenes.showChannelButtons(ctx, subscription.notSubscribed);
        } else {
          await ctx.editMessageText("✅ *BARCHA KANALLARGA OBUNA BO'LGANSIZ!*\n\nMenyudan tanlang:", {
            parse_mode: "Markdown",
          });
          await BotScenes.showMainMenu(ctx);
        }
      } catch (error) {
        console.error("check_subscription error:", error);
        await ctx.answerCbQuery("❌ Xatolik!");
      }
    });

    this.bot.hears(CONFIG.CONTESTS.IPHONE.button_text, async (ctx) => this.handleContestButton(ctx, "IPHONE"));
    this.bot.hears(CONFIG.CONTESTS.REDMI.button_text, async (ctx) => this.handleContestButton(ctx, "REDMI"));
    this.bot.hears(CONFIG.CONTESTS.GENTRA.button_text, async (ctx) => this.handleContestButton(ctx, "GENTRA"));

    this.bot.hears("📋 Konkurs haqida", async (ctx) => {
      await ctx.reply(
        "🏆 *KONKURS HAQIDA*\n\n" +
          "🎁 Sovg'alar:\n• 5 ta iPhone 17 Pro Max\n• 10 ta Redmi\n• 1 ta Gentra\n\n" +
          "⚠️ Kanallardan chiqsangiz chetlashtirilasiz!",
        { parse_mode: "Markdown" }
      );
    });

    this.bot.hears("🔄 Obunani tekshirish", async (ctx) => {
      const userId = ctx.from.id;
      const subscription = await DatabaseService.checkAndUpdateSubscription(ctx.telegram, userId);

      if (subscription.notSubscribed.length > 0) {
        await ctx.reply("❌ *Siz hammasiga obuna emassiz!*\n\nQuyidagilarga obuna bo‘ling:", {
          parse_mode: "Markdown",
        });
        await BotScenes.showChannelButtons(ctx, subscription.notSubscribed);
      } else {
        await ctx.reply("✅ *Barcha kanallarga obuna bo‘lgansiz!*", { parse_mode: "Markdown" });
      }
    });
  }

  async handleContestButton(ctx, contestType) {
    const userId = ctx.from.id;

    try {
      const user = await User.findOne({ userId });
      const subscription = await DatabaseService.checkAndUpdateSubscription(ctx.telegram, userId);

      if (!subscription.isSubscribed) {
        await ctx.reply("❌ Avval barcha kanallarga obuna bo'ling!", { parse_mode: "Markdown" });
        await BotScenes.showChannelButtons(ctx, subscription.notSubscribed);
        return;
      }

      if (user && user.contests[contestType.toLowerCase()]?.participated) {
        const participantId = user.contests[contestType.toLowerCase()]?.participantId;
        const selectedChannel = user.contests[contestType.toLowerCase()]?.selectedChannel;
        await ctx.reply(
          "ℹ️ *SIZ ALLAQACHON QATNASHGANSIZ!*\n\n" + 
          `📝 Sizning ID: ${participantId || "Noma'lum"}\n` +
          `📢 Tanlangan kanal: ${selectedChannel || "Noma'lum"}`,
          { parse_mode: "Markdown" }
        );
        return;
      }

      await ctx.scene.enter(contestType.toLowerCase());
    } catch (error) {
      console.error("handleContestButton error:", error);
      await ctx.reply("⚠️ Xatolik. Keyinroq urinib ko‘ring.", { parse_mode: "Markdown" });
    }
  }

  registerEventHandlers() {
    this.bot.on("chat_member", async (ctx) => {
      try {
        const cm = ctx.chatMember;
        const userId = cm.new_chat_member.user.id;
        const chatId = cm.chat.id;

        const oldStatus = cm.old_chat_member.status;
        const newStatus = cm.new_chat_member.status;

        if (
          (oldStatus === "member" || oldStatus === "administrator") &&
          (newStatus === "left" || newStatus === "kicked")
        ) {
          const result = await DatabaseService.handleUserLeftChannel(String(chatId), userId);

          if (result?.shouldNotify) {
            await this.bot.telegram
              .sendMessage(
                userId,
                `⚠️ *DIQQAT!*\n\nSiz ${result.channelName} kanalidan chiqdingiz.\n❌ Shu sabab konkurslardan chetlashtirildingiz.`,
                { parse_mode: "Markdown" }
              )
              .catch(() => {});
          }
        }

        if (
          (oldStatus === "left" || oldStatus === "kicked") &&
          (newStatus === "member" || newStatus === "administrator")
        ) {
          await DatabaseService.checkAndUpdateSubscription(this.bot.telegram, userId).catch(() => {});
        }
      } catch (error) {
        console.error("chat_member error:", error);
      }
    });
  }

  async start() {
    if (!this.initialized) await this.initialize();

    await this.bot.launch({
      dropPendingUpdates: true,
      allowedUpdates: ["message", "callback_query", "chat_member", "my_chat_member", "chat_join_request"],
    });

    const botInfo = await this.bot.telegram.getMe();
    console.log(`🤖 Bot: @${botInfo.username}`);

    await DatabaseService.checkBotChannelsAccess(this.bot.telegram);

    console.log(`👑 Adminlar: ${CONFIG.ADMIN_IDS.join(", ")}`);
    console.log(`📊 Kanallar: ${CONFIG.REQUIRED_CHANNELS.length} ta`);
    console.log(
      `🎁 Sovg'alar: ${CONFIG.CONTESTS.IPHONE.prize_count} iPhone, ${CONFIG.CONTESTS.REDMI.prize_count} Redmi, ${CONFIG.CONTESTS.GENTRA.prize_count} Gentra`
    );
    console.log("🚀 Bot ishlayapti...");

    setInterval(async () => {
      try {
        console.log("🔄 Obuna holati periodic tekshiruv...");
        const users = await User.find({
          isSubscribed: true,
          lastActivity: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        }).limit(100);

        for (const u of users) {
          await DatabaseService.checkAndUpdateSubscription(this.bot.telegram, u.userId).catch(() => {});
        }
      } catch (e) {
        console.error("Periodic check error:", e);
      }
    }, CONFIG.SETTINGS.subscription_check_interval);
  }

  async stop() {
    try {
      await this.bot.stop();
      await mongoose.connection.close();
      console.log("👋 Bot to‘xtadi");
    } catch (error) {
      console.error("stop error:", error);
    }
  }
}

/* ============================
   7) MAIN EXECUTION
============================ */
async function main() {
  try {
    const bot = new SenatorBot();

    process.once("SIGINT", () => {
      console.log("🛑 SIGINT, shutdown...");
      bot.stop().then(() => process.exit(0)).catch(() => process.exit(1));
    });

    process.once("SIGTERM", () => {
      console.log("🛑 SIGTERM, shutdown...");
      bot.stop().then(() => process.exit(0)).catch(() => process.exit(1));
    });

    await bot.start();
    console.log("🚀 Bot started successfully");
  } catch (error) {
    console.error("❌ Startup error:", error);
    Utils.logToFile("error", "Bot startup error", { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { SenatorBot, DatabaseService, Utils, CONFIG, User, Winner, Log, Notification };