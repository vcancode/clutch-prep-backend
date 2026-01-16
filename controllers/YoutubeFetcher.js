import axios from "axios";
import User from "../Models/UserSchema.js";
import Document from "../Models/GroqDataSchema.js";

const YT_BASE = "https://www.googleapis.com/youtube/v3/search";
const API_KEY = process.env.YOUTUBE_API_KEY;

const fetchYouTube = async (query, type, maxResults) => {
  const { data } = await axios.get(YT_BASE, {
    params: {
      part: "snippet",
      q: query,
      maxResults,
      type,
      key: API_KEY
    }
  });

  return data.items.map(item => ({
    name: item.snippet.title,
    thumbnail: item.snippet.thumbnails.high.url,
    link:
      type === "video"
        ? `https://www.youtube.com/watch?v=${item.id.videoId}`
        : `https://www.youtube.com/playlist?list=${item.id.playlistId}`
  }));
};

export const enrichGroqJson = async (req, res) => {
   try {
    const userId = req.userdata.id;              // ✅ from JWT
    const { documentId } = req.query;           // ✅ from frontend

    if (!documentId) {
      return res.status(400).json({ error: "DOCUMENT_ID_REQUIRED" });
    }

    // 1️⃣ Fetch user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "USER_NOT_FOUND" });
    }

    // 2️⃣ Enforce daily YouTube limit (1 per day)
    const ONE_DAY = 24* 60 * 60 * 1000;
    if (
      user.youtubeLastFetchAt &&
      Date.now() - user.youtubeLastFetchAt.getTime() < ONE_DAY
    ) {
      return res.status(429).json({ error: "YOUTUBE_DAILY_LIMIT_REACHED" });
    }

    // 3️⃣ Fetch document (ownership enforced)
    const document = await Document.findById(documentId);

    if (!document) {
      return res.status(404).json({ error: "DOCUMENT_NOT_FOUND" });
    }

    const groqJson = document.jsonFile;

    if (!groqJson?.subject || !Array.isArray(groqJson?.topics)) {
      return res.status(400).json({ error: "INVALID_GROQ_JSON" });
    }

    // 4️⃣ Subject-level YouTube enrichment
    groqJson.subjectPlaylists = await fetchYouTube(
      groqJson.subject,
      "playlist",
      20
    );

    // 5️⃣ Update document in MongoDB
    document.jsonFile = groqJson;

    document.markModified("jsonFile"); // !because of mixed data type we have to inform mongodb that it has been modified 

    const newdocument = await document.save();
   

    // 6️⃣ Update user's YouTube usage timestamp
    user.youtubeLastFetchAt = new Date();
    await user.save();

    return res.status(200).json({
      message: "DOCUMENT_ENRICHED_AND_UPDATED",
      document:newdocument
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
