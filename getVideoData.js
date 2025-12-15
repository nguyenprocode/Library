const axios = require("axios");

async function getVideoData(videoUrl) {
    if (!videoUrl || typeof videoUrl !== "string") return null;

    const apis = [
        {
            name: "getfvid",
            url: "https://getfvid.online/wp-json/aio-dl/video-data/",
            headers: {
                "accept": "*/*",
                "content-type": "application/x-www-form-urlencoded",
                "origin": "https://getfvid.online",
                "referer": "https://getfvid.online/",
                "user-agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            },
            payload: url =>
                `url=${encodeURIComponent(url)}&token=292e8b8832c594c3fe843b9eb9d9dd16699901dd4d8c998301514542682b7346`
        }
    ];

    for (const api of apis) {
        try {
            const res = await axios({
                method: "POST",
                url: api.url,
                headers: api.headers,
                data: api.payload(videoUrl),
                timeout: 15000
            });

            if (res.status === 200 && res.data) {
                const data = normalizeResponse(res.data);
                if (data && data.medias.length > 0) return data;
            }
        } catch (e) {
            continue;
        }
    }

    return null;
}

function normalizeResponse(data) {
    try {
        const result = {
            title: data.title || "AUTODOWN",
            medias: []
        };

        if (Array.isArray(data.medias)) {
            result.medias = data.medias.map(item => ({
                url: item.url,
                type: detectType(item),
                quality: item.quality || "default"
            }));
        } else if (data.url) {
            result.medias.push({
                url: data.url,
                type: "video",
                quality: "default"
            });
        }

        return result.medias.length ? result : null;
    } catch {
        return null;
    }
}

function detectType(media) {
    if (media.extension) {
        const ext = media.extension.toLowerCase();
        if (["mp4", "mkv", "webm", "mov"].includes(ext)) return "video";
        if (["mp3", "m4a", "aac"].includes(ext)) return "audio";
        if (["jpg", "jpeg", "png", "webp"].includes(ext)) return "image";
    }

    if (media.mime_type) {
        if (media.mime_type.includes("video")) return "video";
        if (media.mime_type.includes("audio")) return "audio";
        if (media.mime_type.includes("image")) return "image";
    }

    return "video";
}

module.exports = { getVideoData };
