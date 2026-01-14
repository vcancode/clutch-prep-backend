import axios from "axios";

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

export const enrichGroqJson = async (groqJson) => {
  if (!Array.isArray(groqJson?.topics)) {
    throw new Error("INVALID_GROQ_JSON");
  }

  // Subject-level playlist (FIXED)
  groqJson.subjectPlaylists = await fetchYouTube(
    groqJson.subject,
    "playlist",
    10
  );

  // Topic enrichment (SEQUENTIAL, SAFE)
  for (const topic of groqJson.topics) {
    const videos = await fetchYouTube(
      topic.topic_query,
      "video",
      10
    );

    topic.videos = videos;
    topic.completed = true;
    delete topic.topic_query;
  }

  return groqJson;
};
