import axios from "axios";

const YT_BASE = "https://www.googleapis.com/youtube/v3/search";
const API_KEY = process.env.YOUTUBE_API_KEY;

const fetchYouTube = async (query, type, maxResults) => {
  try {
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
  } catch (err) {
  console.log(err.message);
  
  }
};

export const enrichGroqJson = async (groqJson,language) => {
  if (!Array.isArray(groqJson?.topics)) {
    throw new Error("INVALID_GROQ_JSON");
  }

  await Promise.all(
    groqJson.topics.map(async topic => {
      const [videos, playlists] = await Promise.all([
        fetchYouTube(topic.topic_query, "video", 8),
        fetchYouTube(topic.playlist_query, "playlist", 10)
      ]);

      topic.videos = videos;
      topic.playlists = playlists;
      topic.completed=false;
      delete topic.topic_query;
      delete topic.playlist_query;
    })
  );

  return groqJson;
};
