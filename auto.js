const axios = require("axios");
const fs = require("fs");
const path = require("path");

const BASE_API = "https://jonell01-ccprojectsapihshs.hf.space";
const isURL = (u) => /^https?:\/\//.test(u);

const cachePath = path.join(__dirname, "cache");
if (!fs.existsSync(cachePath)) {
    fs.mkdirSync(cachePath, { recursive: true });
    console.log("✅ Đã tạo thư mục cache:", cachePath);
}

function extractURL(text) {
    if (typeof text !== "string") return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlRegex);
    return urls ? urls[0] : null;
}

function detectPlatform(url) {
    const map = {
        "facebook.com": "/api/fbdl",
        "fb.watch": "/api/fbdl",
        "tiktok.com": "/api/tikdl",
        "vt.tiktok.com": "/api/tikdl",
        "douyin.com": "/api/dydl",
        "instagram.com": "/api/igdl",
        "youtube.com": "/api/music",
        "youtu.be": "/api/music",
        "soundcloud.com": "/api/sclouddl",
        "twitter.com": "/api/xdl",
        "x.com": "/api/xdl",
        "pinterest.com": "/api/pindl",
        "capcut.com": "/api/capdl",
        "threads.net": "/api/thrdl"
    };
    return Object.entries(map).find(([key]) => url.includes(key))?.[1] || null;
}

async function fetchMedia(url, endpoint) {
    const fullURL = `${BASE_API}${endpoint}?url=${encodeURIComponent(url)}`;
    try {
        console.log("📤 Gửi đến API:", fullURL);
        const res = await axios.get(fullURL, { timeout: 10000 });
        const data = res.data;

        if (!data) {
            console.warn("⚠️ API trả về dữ liệu rỗng.");
            return null;
        }

        if (data.download_url) {
            return {
                title: data.title || "Không tiêu đề",
                author: data.author || "Không rõ",
                medias: [{
                    url: data.download_url,
                    type: "video",
                    extension: "mp4"
                }]
            };
        }

        if (Array.isArray(data.medias)) {
            return {
                title: data.title || "Không tiêu đề",
                author: data.author || "Không rõ",
                medias: data.medias
            };
        }

        console.warn("⚠️ API không trả về định dạng media hợp lệ.");
        return null;
    } catch (err) {
        if (err.code === 'ECONNABORTED') {
            console.error("❌ Timeout khi gọi API:", fullURL);
        } else if (err.response) {
            console.error("❌ Lỗi API:", err.message);
            console.error("📄 Mã lỗi:", err.response.status);
            console.error("📄 Nội dung:", err.response.data);
        } else {
            console.error("❌ Lỗi không xác định:", err.message);
        }
        return null;
    }
}

async function streamMedia(url, type) {
    try {
        const response = await axios.get(url, {
            responseType: "arraybuffer",
            timeout: 15000
        });

        const fileName = `${Date.now()}.${type}`;
        const filePath = path.join(cachePath, fileName);
        fs.writeFileSync(filePath, response.data);

        setTimeout(() => {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }, 60000);

        return fs.createReadStream(filePath);
    } catch (err) {
        console.error(`❌ Lỗi khi tải file từ ${url}:`, err.message);
        return null;
    }
}

exports.handleEvent = async function (o) {
    try {
        const { body, threadID, messageID } = o.event;
        const send = (msg) => o.api.sendMessage(msg, threadID, messageID);

        const url = extractURL(body);
        if (!url || !isURL(url)) return;

        const endpoint = detectPlatform(url);
        if (!endpoint) return;

        const mediaData = await fetchMedia(url, endpoint);
        if (!mediaData) return send("❌ Không thể lấy dữ liệu từ URL này.");

        const { title, author, medias } = mediaData;
        let bodyMsg = `🔗 URL: ${url}\n👤 Tác giả: ${author}\n📖 Tiêu đề: ${title}`;
        const attachments = [];

        for (const media of medias) {
            const ext = media.extension || "mp4";
            const stream = await streamMedia(media.url, ext);
            if (stream) {
                attachments.push(stream);
            } else {
                bodyMsg += `\n⚠️ Không thể tải: ${media.url}`;
            }
        }

        if (attachments.length > 0) {
            send({ body: bodyMsg, attachment: attachments });
        } else {
            send(bodyMsg + "\n❌ Không có nội dung nào được gửi lại.");
        }
    } catch (err) {
        console.error("❌ Lỗi xử lý sự kiện:", err);
    }
};

exports.run = () => {};

exports.config = {
    name: "auto",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "Thêm tôi vào nữa nha =))",
    description: "Người đẹp giải quyết cũng ổn rùi nè =))",
    commandCategory: "Tiện ích",
    usages: [],
    cooldowns: 3
};
