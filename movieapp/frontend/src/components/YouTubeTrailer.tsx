/**
 * YouTube Trailer iFrame Component
 * Embeds YouTube videos securely with sandbox restrictions
 */

import React from 'react';
import { Dialog, DialogTitle, DialogContent, IconButton, Box } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface YouTubeTrailerProps {
  open: boolean;
  trailerUrl: string;
  movieTitle: string;
  onClose: () => void;
}

/**
 * Extract YouTube video ID from various URL formats:
 * - https://www.youtube.com/watch?v=dQw4w9WgXcQ
 * - https://youtu.be/dQw4w9WgXcQ
 * - dQw4w9WgXcQ
 */
const extractYouTubeId = (url: string): string => {
  try {
    const patterns = [
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&]+)/,
      /(?:https?:\/\/)?youtu\.be\/([^?]+)/,
      /^([a-zA-Z0-9_-]{11})$/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return '';
  } catch (error) {
    console.error('Error extracting YouTube ID:', error);
    return '';
  }
};

const YouTubeTrailer: React.FC<YouTubeTrailerProps> = ({
  open,
  trailerUrl,
  movieTitle,
  onClose
}) => {
  const videoId = extractYouTubeId(trailerUrl);
  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`;

  if (!videoId) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogContent sx={{ textAlign: 'center', py: 4 }}>
          <p>Invalid trailer URL: {trailerUrl}</p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          backgroundColor: '#000'
        }
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#1a1a1a',
          color: '#fff'
        }}
      >
        {movieTitle} - Trailer
        <IconButton
          onClick={onClose}
          sx={{ color: '#fff' }}
          aria-label="close"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2, backgroundColor: '#000' }}>
        <Box
          sx={{
            position: 'relative',
            paddingBottom: '56.25%',
            height: 0,
            overflow: 'hidden',
            backgroundColor: '#000'
          }}
        >
          {/* YouTube iFrame with Security Sandbox */}
          <iframe
            title={`${movieTitle} Trailer`}
            src={embedUrl}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 'none'
            }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            sandbox="allow-scripts allow-accelerometer allow-autoplay allow-clipboard-write allow-encrypted-media allow-gyroscope allow-picture-in-picture allow-same-origin"
          />
        </Box>

        <Box sx={{ mt: 2, color: '#fff', fontSize: '0.9em' }}>
          <p>🎥 This video is embedded from YouTube</p>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default YouTubeTrailer;
