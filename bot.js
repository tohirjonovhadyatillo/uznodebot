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

  // Majburiy obuna kanallari
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
      id: "@SENATOR_yohohobet",
      name: "SENATOR PUBGM",
      url: "https://t.me/senator_yohohobet",
      type: "public",
      username: "@SENATOR_yohohobet",
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
  ],

  // Contest Configuration
  CONTESTS: {
    IPHONE: {
      name: "iPhone 17 Pro Max",
      prize_count: 5,
      site_url:
        "https://qbaff.com/L?tag=s_4361464m_94905c_&site=4361464&ad=94905&r=uz/registration",
      promo_code: "SENATOR",
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
    subscription_check_interval: 300000,
    max_retries: 3,
    request_timeout: 10000,
    cache_duration: 300000,
    max_users_per_day: 1000,
    max_requests_per_minute: 20,
    maintenance_mode: false,
    debug_mode: process.env.NODE_ENV === "development",
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
      },
    ],
    isSubscribed: { type: Boolean, default: false, index: true },
    subscriptionCheckedAt: Date,

    contests: {
      iphone: {
        participated: { type: Boolean, default: false },
        participantId: { type: String, sparse: true },
        participationDate: Date,
      },
      redmi: {
        participated: { type: Boolean, default: false },
        participantId: { type: String, sparse: true },
        participationDate: Date,
      },
      gentra: {
        participated: { type: Boolean, default: false },
        participantId: { type: String, sparse: true },
        participationDate: Date,
      },
    },

    participationCount: { type: Number, default: 0 },
    lastActivity: Date,

    isBlocked: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },

    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  },
);

userSchema.virtual("fullName").get(function () {
  return `${this.firstName || ""} ${this.lastName || ""}`.trim();
});

const User = mongoose.model("User", userSchema);

const logSchema = new mongoose.Schema({
  level: {
    type: String,
    enum: ["error", "warn", "info", "debug"],
    required: true,
  },
  source: {
    type: String,
    enum: ["bot", "admin", "system"],
    required: true,
  },
  action: { type: String, required: true },
  userId: Number,
  message: { type: String, required: true },
  details: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
});

const Log = mongoose.model("Log", logSchema);

// ============================
// 3. UTILITY FUNCTIONS
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

  // ID faqat raqamlardan iboratligini tekshirish
  static validateId(id) {
    if (!id || id === "") {
      throw new Error("❌ ID raqam kiritilmadi!");
    }

    // ID ni tozalash
    id = id.toString().trim();

    // Faqat raqamlardan iboratligini tekshirish
    if (!/^\d+$/.test(id)) {
      throw new Error("❌ ID faqat raqamlardan iborat bo'lishi kerak!");
    }

    // Minimal uzunlik (kamida 4 ta raqam)
    if (id.length < 4) {
      throw new Error("❌ ID kamida 4 ta raqamdan iborat bo'lishi kerak!");
    }

    // Maksimal uzunlik
    if (id.length > 15) {
      throw new Error("❌ ID 15 ta raqamdan oshmasligi kerak!");
    }

    return id;
  }

  static async retryOperation(operation, maxRetries = 3, delay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        console.log(`🔄 Retry ${i + 1}/${maxRetries} after error: ${error.message}`);
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
      });

      mongoose.connection.on("error", (err) => {
        console.error("❌ MongoDB connection error:", err);
      });

      return mongoose.connection;
    } catch (error) {
      console.error("❌ MongoDB ga ulanib bo'lmadi:", error);
      throw error;
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
            isSubscribed: false,
            contests: {
              iphone: { participated: false },
              redmi: { participated: false },
              gentra: { participated: false },
            },
            lastActivity: new Date(),
          });

          await user.save();
          console.log(`👤 Yangi foydalanuvchi: ${username || first_name} (${id})`);
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

        // Cache tekshirish
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
          try {
            let isMember = false;

            try {
              const member = await bot.getChatMember(channel.id, userId);
              isMember = !(member.status === "left" || member.status === "kicked");
            } catch (error) {
              console.log(`Kanalni tekshirishda xatolik (${channel.name}):`, error.message);
            }

            if (isMember) {
              subscribedChannels.push({
                channelId: channel.id,
                channelName: channel.name,
                subscribedAt: new Date(),
              });
            } else {
              notSubscribed.push(channel);
            }
          } catch (error) {
            console.error(`Kanalni tekshirishda xatolik (${channel.name}):`, error.message);
            notSubscribed.push(channel);
          }
        }

        const isSubscribed = notSubscribed.length === 0;

        user.isSubscribed = isSubscribed;
        user.subscribedChannels = subscribedChannels;
        user.subscriptionCheckedAt = new Date();
        user.lastActivity = new Date();

        await user.save();

        return { isSubscribed, notSubscribed };
      } catch (error) {
        console.error("Obunani tekshirishda xatolik:", error);
        throw error;
      }
    });
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
          throw new Error("Bu ID allaqachon boshqa foydalanuvchi tomonidan kiritilgan");
        }

        // Update user
        user.contests[contestType] = {
          participated: true,
          participantId: participantId,
          participationDate: new Date(),
        };

        user.participationCount += 1;
        user.lastActivity = new Date();

        await user.save();

        console.log(`🎯 Foydalanuvchi ${userId} ${contestType} konkursiga qatnashdi`);
        return user;
      } catch (error) {
        console.error("Konkursga qatnashishda xatolik:", error);
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
        todayUsers,
        activeUsers,
        blockedUsers,
      };
    } catch (error) {
      console.error("Statistika olishda xatolik:", error);
      throw error;
    }
  }
}

// ============================
// 5. BOT SCENES
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
        const hasParticipated = user.contests[contestType.toLowerCase()]?.participated || false;

        if (hasParticipated) {
          const participantId = user.contests[contestType.toLowerCase()]?.participantId;
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

        await ctx.reply(contestInfo, {
          parse_mode: "Markdown",
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

    // Qatnashish action
    scene.action(`participate_${contestType.toLowerCase()}`, async (ctx) => {
      try {
        await ctx.editMessageText(
          "📝 *ID raqamingizni yuboring:*\n\n" +
            "Iltimos, saytdan olingan ID raqamingizni yuboring.\n\n" +
            "*Eslatma:* ID faqat raqamlardan iborat bo'lishi kerak!",
          {
            parse_mode: "Markdown",
          },
        );

        // Wait for ID input
        scene.on("text", async (ctx) => {
          try {
            const userId = ctx.from.id;
            const participantId = ctx.message.text.trim();

            console.log(`${contestType} uchun ID kiritildi: ${participantId}`);

            // Validate ID - faqat raqam tekshirish
            let validId;
            try {
              validId = Utils.validateId(participantId);
              console.log(`ID validatsiyadan o'tdi: ${validId}`);
            } catch (validationError) {
              console.log(`Validatsiya xatosi: ${validationError.message}`);
              await ctx.reply(validationError.message, { parse_mode: "Markdown" });
              return scene.enter(ctx);
            }

            // Participate in contest
            await DatabaseService.participateInContest(
              userId,
              contestType.toLowerCase(),
              validId,
            );

            await ctx.reply(
              "🎉 *TABRIKLAYMIZ!*\n\n" +
                "Siz konkursga muvaffaqiyatli qatnashdingiz!\n" +
                `📝 Sizning ID raqamingiz: \`${validId}\`\n\n` +
                "🏆 G'oliblar adminlar tomonidan aniqlanadi va sizga xabar beriladi.\n" +
                "🔔 Kutib turing, natijalar yaqin orada e'lon qilinadi!\n\n" +
                "⚠️ *Diqqat:* Agar kanallardan chiqsangiz, konkursdan avtomatik chetlashtirilasiz!",
              { parse_mode: "Markdown" },
            );

            // Show main menu
            await this.showMainMenu(ctx);
          } catch (error) {
            console.error(`${contestType} ID qayta ishlash xatosi:`, error);
            await ctx.reply(error.message, { parse_mode: "Markdown" });
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

    // Bekor qilish action
    scene.action(`cancel_${contestType.toLowerCase()}`, async (ctx) => {
      await ctx.editMessageText("❌ Konkurs bekor qilindi.");
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
            "Quyidagi tugmalardan birini tanlang:",
          {
            parse_mode: "Markdown",
            ...Markup.inlineKeyboard([
              [Markup.button.callback("📊 Statistika", "admin_stats")],
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

    // Statistika action
    scene.action("admin_stats", async (ctx) => {
      try {
        const stats = await DatabaseService.getStatistics();

        await ctx.editMessageText(
          `📊 *BOT STATISTIKASI*\n\n` +
            `👥 *Jami foydalanuvchilar:* ${stats.totalUsers}\n` +
            `🚫 *Bloklanganlar:* ${stats.blockedUsers}\n` +
            `📈 *Bugun qo\'shilgan:* ${stats.todayUsers}\n` +
            `🔥 *Faol foydalanuvchilar:* ${stats.activeUsers}\n` +
            `✅ *Obuna bo\'lganlar:* ${stats.subscribedUsers}\n\n` +
            `📱 *iPhone ishtirokchilar:* ${stats.iphoneParticipants}\n` +
            `📱 *Redmi ishtirokchilar:* ${stats.redmiParticipants}\n` +
            `🚗 *Gentra ishtirokchilar:* ${stats.gentraParticipants}\n\n` +
            `🕒 *Oxirgi yangilanish:* ${Utils.formatDate(new Date(), "time")}`,
          { parse_mode: "Markdown" },
        );
      } catch (error) {
        console.error("Admin stats error:", error);
        await ctx.answerCbQuery("❌ Statistika olishda xatolik!");
      }
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

      const message = "Botdan to'liq foydalanish uchun quyidagi kanallarga obuna bo'ling:";

      await ctx.reply(message, {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard(buttons),
      });
    } catch (error) {
      console.error("Channel buttons error:", error);
    }
  }
}

// ============================
// 6. BOT MAIN CLASS
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
    process.on("unhandledRejection", (reason, promise) => {
      console.error("⚠️ Unhandled Rejection at:", promise, "reason:", reason);
    });

    process.on("uncaughtException", (error) => {
      console.error("⚠️ Uncaught Exception:", error);
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
          try {
            if (ctx.callbackQuery) {
              await ctx.answerCbQuery("⚠️ Xatolik yuz berdi. Keyinroq urinib ko'ring.");
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
          "• Agar kanallardan chiqsangiz, konkursdan avtomatik chetlashtirilasiz!",
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
          "• Agar kanallardan chiqsangiz, konkursdan avtomatik chetlashtirilasiz!",
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
        const participantId = user.contests[contestType.toLowerCase()]?.participantId;
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

  async start() {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      await this.bot.launch({
        dropPendingUpdates: true,
        allowedUpdates: ["message", "callback_query"],
      });

      const botInfo = await this.bot.telegram.getMe();
      console.log(`🤖 Bot: @${botInfo.username}`);
      console.log(`👑 Adminlar: ${CONFIG.ADMIN_IDS.join(", ")}`);
      console.log(`📊 Kanallar: ${CONFIG.REQUIRED_CHANNELS.length} ta`);
      console.log(
        `📱 Sovg'alar: ${CONFIG.CONTESTS.IPHONE.prize_count} iPhone, ${CONFIG.CONTESTS.REDMI.prize_count} Redmi, ${CONFIG.CONTESTS.GENTRA.prize_count} Gentra`,
      );
      console.log("🚀 Bot faol va ishlamoqda...");
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

    console.log("🚀 Bot started successfully");
  } catch (error) {
    console.error("❌ Botni ishga tushirishda og'ir xatolik:", error);
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
};