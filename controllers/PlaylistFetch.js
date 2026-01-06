import axios from "axios";

export const searchPlaylists = async (req, res) => {
  try {
    const { keyword } = req.query;

    if (!keyword) {
      return res.status(400).json({
        success: false,
        error: "Playlist search keyword is required"
      });
    }

    const response = await axios.get(
      "https://www.googleapis.com/youtube/v3/search",
      {
        params: {
          part: "snippet",
          q: keyword,
          type: "playlist",
          maxResults: 15,
          key: process.env.YOUTUBE_API_KEY
        }
      }
    );

    const playlists = response.data.items.map(item => ({
      playlistId: item.id.playlistId,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails?.medium?.url,
      playlistUrl: `https://www.youtube.com/playlist?list=${item.id.playlistId}`
    }));

    res.json({
      success: true,
      count: playlists.length,
      playlists
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message
    });
  }
};


