# Automated Posts for Instagram Bot

This project automates the process of posting updates to Instagram whenever an artist from a pre-defined list releases a new song or album. It utilizes multiple APIs and services to generate content, prepare media, and automatically post to Instagram.

## Features

- Fetches new releases from Spotify for a list of artists.
- Retrieves artist images from AWS S3.
- Generates a CSV file with release information including:
  - Artist name
  - Song title
  - Album
  - Release date
  - Spotify URL
  - Artist image
- Inserts data into a Photoshop template to create an image for posting.
- Generates a headline and caption using the OpenAI API.
- Auto-posts to Instagram using the Facebook Graph API.

## Technologies Used

- **Node.js**: Backend environment.
- **Spotify API**: Fetches artist release data.
- **AWS S3**: Stores and retrieves artist images.
- **OpenAI API**: Generates captions and headlines.
- **Facebook Graph API**: Posts to Instagram.
- **Photoshop Scripting**: Automates image creation using release data.

## Installation

- Required .env
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
OPENAI_API_KEY=
FACEBOOK_ACCESS_TOKEN=
