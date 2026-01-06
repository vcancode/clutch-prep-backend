import { google } from "googleapis";
import "dotenv/config";

const youtube = google.youtube({
  version: "v3",
  auth: process.env.YOUTUBE_API_KEY,
});

// helper: fetch ONE video for ONE query
async function fetchOneVideo(query) {
  const res = await youtube.search.list({
    part: "snippet",
    q: query,
    type: "video",
    maxResults: 1,
    relevanceLanguage: "en",
    safeSearch: "strict",
  });

  if (!res.data.items || res.data.items.length === 0) {
    return null;
  }

  const item = res.data.items[0];

  return {
    title: item.snippet.title,
    thumbnail: item.snippet.thumbnails.medium.url,
    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
  };
}

// controller
const YoutubeFetcher = async (req, res) => {
  try {
    const { topics } = req.body;

    if (!topics || !Array.isArray(topics)) {
      return res.status(400).json({
        success: false,
        error: "Invalid topics payload",
      });
    }

    const finalResponse = [];

    for (const topic of topics) {
      const videos = [];

      // take only first 2 queries
      const queries = (topic.youtube_queries || []).slice(0, 2);

      for (const q of queries) {
        const video = await fetchOneVideo(q);
        if (video) videos.push(video);
      }

      finalResponse.push({
        topic: topic.main_topic,
        videos,
      });
    }

    return res.json({
      success: true,
      data: finalResponse,
    });
  } catch (err) {
    console.error("YouTube fetch error:", err.message);

    return res.status(500).json({
      success: false,
      error: "Failed to fetch YouTube videos",
    });
  }
};

export default YoutubeFetcher;
