// Configuration
const apps = [
  {id: 'plex', name: 'Plex', url: 'http://192.168.1.24:32400/web', img: 'images/Plex.png'},
  {id: 'sonarr', name: 'Sonarr', url: 'http://192.168.1.24:8989', img: 'images/Sonarr.png'},
  {id: 'radarr', name: 'Radarr', url: 'http://192.168.1.24:7878', img: 'images/Radarr.png'},
  {id: 'lidarr', name: 'Lidarr', url: 'http://192.168.1.24:8686', img: 'images/Lidarr.png'},
  {id: 'bazarr', name: 'Bazarr', url: 'http://192.168.1.24:6767', img: 'images/Bazarr.png'},
  {id: 'prowlarr', name: 'Prowlarr', url: 'http://192.168.1.24:9696', img: 'images/Prowlarr.png'},
  {id: 'sabnzbd', name: 'SABnzbd', url: 'http://192.168.1.24:8080/', img: 'images/Sabnzbd.png'},
  {id: 'tautulli', name: 'Tautulli', url: 'http://192.168.1.24:8181', img: 'images/Tautulli.png'},
  {id: 'jellyseerr', name: 'Jellyseerr', url: 'http://192.168.1.17:5055', img: 'images/Jellyfin.png'},
  // External sites below
  {id: 'seedr', name: 'Seedr', url: 'https://www.seedr.cc/files', img: 'images/Seedr.png'},
  {id: 'yts', name: 'YTS', url: 'https://yts.mx/', img: 'images/YTS.png'},
  {id: '1337x', name: '1337x', url: 'https://1337x.to/home/', img: 'images/1337X.png'}
];

// API configuration
const apiEndpoint = 'http://192.168.1.24:5001';