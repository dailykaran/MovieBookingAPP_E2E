import React from 'react';
import { Box } from '@mui/material';

interface LogoProps {
  size?: 'small' | 'medium' | 'large' | 'xlarge';
}

const Logo: React.FC<LogoProps> = ({ size = 'large' }) => {
  const sizes = {
    small: { width: 40, height: 40 },
    medium: { width: 56, height: 56 },
    large: { width: 72, height: 72 },
    xlarge: { width: 96, height: 96 },
  };

  const dims = sizes[size];

  return (
    <Box
      component="img"
      src="/TV_Logo.png"
      alt="TicketsVenue Logo"
      sx={{
        width: dims.width,
        height: dims.height,
        marginRight: 1.5,
        borderRadius: '50%',
        filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))',
        transition: 'transform 0.3s ease-in-out',
        '&:hover': {
          transform: 'scale(1.05)',
        },
      }}
    />
  );
};

export default Logo;
