// Default profile picture - using default_dp.png as the default avatar
// This is the primary default image that should be used throughout the app
let DEFAULT_PROFILE_PICTURE;
try {
  DEFAULT_PROFILE_PICTURE = require('../../assets/user/default_dp.png');
} catch (error) {
  console.warn('⚠️ Could not load default_dp.png, using fallback');
  // Create a square fallback image instead of circular
  DEFAULT_PROFILE_PICTURE = {
    uri: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiByeD0iOCIgZmlsbD0iIzhCNUNGNiIvPgo8c3ZnIHg9IjMwIiB5PSIzMCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9IndoaXRlIj4KPHBhdGggZD0ibTEyIDEyYzEuNjU0IDAgMy0xLjM0NiAzLTNzLTEuMzQ2LTMtMy0zLTMgMS4zNDYtMyAzczEuMzQ2IDMgMyAzWm0xLjUgMGggMS41djE1aC0zYzAgMCAwLTEuMzQ2LTEuNS0zLTMtMy4zMzYtLjY0LTYuNjcxLTQtMTBoMnoiLz4KPC9zdmc+Cjwvc3ZnPgo='
  };
}

export { DEFAULT_PROFILE_PICTURE };

// Fallback: Use the same default_dp.png for consistency
let DEFAULT_PROFILE_PICTURE_FALLBACK;
try {
  DEFAULT_PROFILE_PICTURE_FALLBACK = require('../../assets/user/default_dp.png');
} catch (error) {
  console.warn('⚠️ Could not load fallback default_dp.png, using data URI');
  DEFAULT_PROFILE_PICTURE_FALLBACK = DEFAULT_PROFILE_PICTURE;
}

export { DEFAULT_PROFILE_PICTURE_FALLBACK };

// Create a SQUARE data URI fallback for extreme cases (changed rx from 60 to 8)
export const DEFAULT_PROFILE_PICTURE_DATA_URI = {
  uri: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiByeD0iOCIgZmlsbD0iIzhCNUNGNiIvPgo8c3ZnIHg9IjMwIiB5PSIzMCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9IndoaXRlIj4KPHBhdGggZD0ibTEyIDEyYzEuNjU0IDAgMy0xLjM0NiAzLTNzLTEuMzQ2LTMtMy0zLTMgMS4zNDYtMyAzczEuMzQ2IDMgMyAzWm0xLjUgMGggMS41djE1aC0zYzAgMCAwLTEuMzQ2LTEuNS0zLTMtMy4zMzYtLjY0LTYuNjcxLTQtMTBoMnoiLz4KPC9zdmc+Cjwvc3ZnPgo='
};

// Helper function to get the best available default profile picture
export const getDefaultProfilePicture = () => {
  if (DEFAULT_PROFILE_PICTURE) {
    return DEFAULT_PROFILE_PICTURE;
  }
  if (DEFAULT_PROFILE_PICTURE_FALLBACK) {
    return DEFAULT_PROFILE_PICTURE_FALLBACK;
  }
  return DEFAULT_PROFILE_PICTURE_DATA_URI;
};
