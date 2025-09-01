from datetime import datetime as dt
from flask import Flask, jsonify
from flask_cors import CORS
import requests

API_CONFIG = {
    'tautulli': {
        'url': 'http://localhost:8181/api/v2',
        'key': 'a27404f5c80c4cb693f11a65f5956357'
    },
    'jellyseerr': {
        'url': 'http://192.168.1.17:5055',
        'key': 'MTc1NjA2MDE5MTc2NmJmYWZjNDdhLWI1NmQtNGYzMS1hMDJiLTc0ZmMyMzNiMDU5Nw=='
    },
    'sonarr': {
        'url': 'http://localhost:8989/api/v3',
        'key': '6ff1a3b70dcf40f1a7c1c7f05fbf2b5a'
    },
    'radarr': {
        'url': 'http://localhost:7878/api/v3',
        'key': 'c42c4e3ef0ad474d8f5187ecba354c63'
    },
    'tmdb': {
        'key': '856f234eac9bb13adef436fd80598995',
        'v4_token': 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI4NTZmMjM0ZWFjOWJiMTNhZGVmNDM2ZmQ4MDU5ODk5NSIsIm5iZiI6MTc1NTc0OTIxMS43OTcsInN1YiI6IjY4YTY5YjViYzNmYTJmM2UwNGZkMjk2ZiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.H_LMiJiNP53U38wX-zBvgStjdSRd7hYHMokwYQJ3XRY'
    }
}

app = Flask(__name__)
CORS(app)

def generate_fallback_poster(title, service='unknown'):
    first_letter = title[0].upper() if title else '?'
    color_map = {
        'jellyseerr': '6366f1',
        'radarr': 'fbbf24',
        'sonarr': '3b82f6',
        'tautulli': 'f59e0b'
    }
    bg_color = color_map.get(service, '1a1a1a')
    text_color = 'ffffff'
    return f"https://placehold.co/300x450/{bg_color}/{text_color}?text={first_letter}"

def get_tmdb_poster(tmdb_id, media_type='movie'):
    if not tmdb_id:
        return None, None
    try:
        url = f"https://api.themoviedb.org/3/{media_type}/{tmdb_id}"
        headers = {
            "Authorization": f"Bearer {API_CONFIG['tmdb']['v4_token']}"
        }
        resp = requests.get(url, headers=headers, timeout=8)
        if resp.ok:
            data = resp.json()
            poster_path = data.get('poster_path')
            title = data.get('title') or data.get('name')
            if poster_path:
                return f"https://image.tmdb.org/t/p/w500{poster_path}", title
        return None, None
    except Exception as e:
        print(f"[TMDb] Error: {e}")
        return None, None

def search_tmdb_movie(title, year=None):
    try:
        url = "https://api.themoviedb.org/3/search/movie"
        headers = {
            "Authorization": f"Bearer {API_CONFIG['tmdb']['v4_token']}"
        }
        params = {"query": title}
        if year:
            params["year"] = year
        resp = requests.get(url, headers=headers, params=params, timeout=8)
        if resp.ok and resp.json().get("results"):
            result = resp.json()["results"][0]
            return result["id"], result.get("poster_path"), result.get("title")
    except Exception as e:
        print(f"[TMDb Search] Error: {e}")
    return None, None, None

def search_tmdb_tv(title, year=None):
    try:
        url = "https://api.themoviedb.org/3/search/tv"
        headers = {
            "Authorization": f"Bearer {API_CONFIG['tmdb']['v4_token']}"
        }
        params = {"query": title}
        if year:
            params["first_air_date_year"] = year
        resp = requests.get(url, headers=headers, params=params, timeout=8)
        if resp.ok and resp.json().get("results"):
            result = resp.json()["results"][0]
            return result["id"], result.get("poster_path"), result.get("name")
    except Exception as e:
        print(f"[TMDb TV Search] Error: {e}")
    return None, None, None

def get_radarr_tmdb_id(movie_id):
    try:
        headers = {'X-Api-Key': API_CONFIG['radarr']['key']}
        url = f"{API_CONFIG['radarr']['url']}/movie/{movie_id}"
        resp = requests.get(url, headers=headers, timeout=5)
        if resp.ok:
            return resp.json().get('tmdbId')
    except Exception as e:
        print(f"[RadarrTMDb] Error: {e}")
    return None

def get_sonarr_tvdb_id(series_id):
    try:
        headers = {'X-Api-Key': API_CONFIG['sonarr']['key']}
        url = f"{API_CONFIG['sonarr']['url']}/series/{series_id}"
        resp = requests.get(url, headers=headers, timeout=5)
        if resp.ok:
            return resp.json().get('tvdbId')
    except Exception as e:
        print(f"[SonarrTVDb] Error: {e}")
    return None

def get_tmdb_id_from_tvdb(tvdb_id):
    if not tvdb_id:
        return None
    try:
        url = f"https://api.themoviedb.org/3/find/{tvdb_id}?external_source=tvdb_id"
        headers = {
            "Authorization": f"Bearer {API_CONFIG['tmdb']['v4_token']}"
        }
        resp = requests.get(url, headers=headers, timeout=5)
        if resp.ok:
            data = resp.json()
            results = data.get("tv_results")
            if results and len(results) > 0:
                return results[0].get("id")
    except Exception as e:
        print(f"[TMDb/tvdb] Error: {e}")
    return None

def get_jellyseerr_requests_data():
    try:
        headers = {'X-Api-Key': API_CONFIG['jellyseerr']['key']}
        url = f"{API_CONFIG['jellyseerr']['url']}/api/v1/request"
        resp = requests.get(url, headers=headers, params={'take': 20, 'sort': 'added'}, timeout=8)
        if not resp.ok:
            print(f"[Jellyseerr] API error: {resp.status_code}")
            return []
        results = resp.json().get('results', [])
        activities = []
        for req in results:
            media = req.get('media', {})
            status_map = {
                1: ('request', '📝 PENDING'),
                2: ('approved', '✅ APPROVED'),
                3: ('available', '🎬 AVAILABLE'),
                4: ('declined', '❌ DECLINED'),
                5: ('processing', '⚙️ PROCESSING')
            }
            status_id = req.get('status', 1)
            activity_type, status_text = status_map.get(status_id, ('request', 'UNKNOWN'))
            media_type = media.get('mediaType', 'movie')
            title = media.get('title') or media.get('name') or f"Unknown {media_type.title()}"
            tmdb_id = media.get('tmdbId') or media.get('tmdb_id')
            poster_url, nice_title = get_tmdb_poster(tmdb_id, media_type)
            if not poster_url:
                poster_url = generate_fallback_poster(title, 'jellyseerr')
            if nice_title:
                title = nice_title
            if str(title).lower().startswith("unknown"):
                continue
            requested_by = req.get('requestedBy', {})
            user = requested_by.get('displayName') if isinstance(requested_by, dict) else (requested_by or 'Unknown')
            type_text = '🎬 Movie' if media_type == 'movie' else '📺 TV Show' if media_type == 'tv' else 'Media'
            subtitle = f"Requested by {user} • {type_text}"
            activities.append({
                'id': f"jellyseerr-{req.get('id')}",
                'type': activity_type,
                'title': title,
                'subtitle': subtitle,
                'poster': poster_url,
                'status': activity_type,
                'statusText': status_text,
                'timestamp': req.get('createdAt', dt.now().isoformat()),
                'source': 'jellyseerr',
                'transcoding': False
            })
        return activities
    except Exception as e:
        print(f"[Jellyseerr] Error: {e}")
        return []

def get_sonarr_queue_data():
    try:
        headers = {'X-Api-Key': API_CONFIG['sonarr']['key']}
        url = f"{API_CONFIG['sonarr']['url']}/queue"
        resp = requests.get(url, headers=headers, timeout=8)
        if not resp.ok:
            print(f"[Sonarr] API error: {resp.status_code}")
            return []
        records = resp.json().get('records', [])
        activities = []
        for item in records:
            status = item.get('status', '').lower()
            activity_type = {
                'completed': 'completed',
                'downloading': 'download',
                'queued': 'download',
                'paused': 'paused'
            }.get(status, 'processing')
            status_text = {
                'completed': '✅ COMPLETED',
                'downloading': '⬇️ DOWNLOADING',
                'queued': '⬇️ QUEUED',
                'paused': '⏸️ PAUSED'
            }.get(status, '⚙️ PROCESSING')
            size = item.get('size', 0)
            size_left = item.get('sizeleft', 0)
            progress = int(((size - size_left) / size) * 100) if size > 0 else 0
            series = item.get('series', {})
            series_title = series.get('title', 'Unknown Series')
            episode = item.get('episode', {})
            season_num = episode.get('seasonNumber', 0)
            episode_num = episode.get('episodeNumber', 0)
            episode_title = episode.get('title', 'Unknown Episode')
            if season_num and episode_num:
                title = f"{series_title} - S{season_num:02d}E{episode_num:02d}"
            else:
                title = f"{series_title} - Episode"
            if str(series_title).lower().startswith("unknown"):
                continue
            tmdb_id = series.get('tmdbId') or series.get('tmdb_id')
            if not tmdb_id:
                tvdb_id = series.get('tvdbId') or get_sonarr_tvdb_id(series.get('id'))
                tmdb_id = get_tmdb_id_from_tvdb(tvdb_id)
            poster_url, nice_title = get_tmdb_poster(tmdb_id, 'tv')
            if not poster_url:
                poster_url = generate_fallback_poster(series_title, 'sonarr')
            if nice_title:
                series_title = nice_title
            activities.append({
                'id': f"sonarr-{item.get('id')}",
                'type': activity_type,
                'title': title,
                'subtitle': episode_title,
                'progress': progress,
                'poster': poster_url,
                'status': activity_type,
                'statusText': status_text,
                'timestamp': item.get('added', dt.now().isoformat()),
                'source': 'sonarr',
                'transcoding': False
            })
        return activities
    except Exception as e:
        print(f"[Sonarr] Error: {e}")
        return []

def get_radarr_queue_data():
    try:
        headers = {'X-Api-Key': API_CONFIG['radarr']['key']}
        url = f"{API_CONFIG['radarr']['url']}/queue"
        resp = requests.get(url, headers=headers, timeout=8)
        if not resp.ok:
            print(f"[Radarr] API error: {resp.status_code}")
            return []
        records = resp.json().get('records', [])
        activities = []
        seen = set()
        for item in records:
            movie = item.get('movie', {})
            movie_id = item.get('movieId', movie.get('id'))
            if movie_id in seen:
                continue
            seen.add(movie_id)
            status = item.get('status', '').lower()
            activity_type = {
                'completed': 'completed',
                'downloading': 'download',
                'queued': 'download',
                'paused': 'paused'
            }.get(status, 'processing')
            status_text = {
                'completed': '✅ COMPLETED',
                'downloading': '⬇️ DOWNLOADING',
                'queued': '⬇️ QUEUED',
                'paused': '⏸️ PAUSED'
            }.get(status, '⚙️ PROCESSING')
            size = item.get('size', 0)
            size_left = item.get('sizeleft', 0)
            progress = int(((size - size_left) / size) * 100) if size > 0 else 0
            movie_title = (
                movie.get('title') or 
                item.get('title') or 
                item.get('movieTitle') or
                'Unknown Movie'
            )
            tmdb_id = movie.get('tmdbId') or movie.get('tmdb_id')
            if not tmdb_id:
                tmdb_id = get_radarr_tmdb_id(movie_id)
            poster_url, nice_title = get_tmdb_poster(tmdb_id, 'movie')
            if not poster_url:
                poster_url = generate_fallback_poster(movie_title, 'radarr')
            if nice_title:
                movie_title = nice_title
            if str(movie_title).lower().startswith("unknown"):
                continue
            activities.append({
                'id': f"radarr-{item.get('id')}-{movie_id}",
                'type': activity_type,
                'title': movie_title,
                'subtitle': "Movie",
                'progress': progress,
                'poster': poster_url,
                'status': activity_type,
                'statusText': status_text,
                'timestamp': item.get('added', dt.now().isoformat()),
                'source': 'radarr',
                'transcoding': False
            })
        return activities
    except Exception as e:
        print(f"[Radarr] Error: {e}")
        return []

def any_transcoding(sess):
    transcode_keys = [
        "transcode_decision",
        "container_decision",
        "video_decision",
        "audio_decision",
        "subtitle_decision",
        "stream_video_decision",
        "stream_audio_decision",
        "stream_subtitle_decision"
    ]
    for key in transcode_keys:
        if sess.get(key, "").lower() == "transcode":
            return True
    return False

def get_tautulli_activity_data():
    try:
        url = API_CONFIG['tautulli']['url']
        params = {'apikey': API_CONFIG['tautulli']['key'], 'cmd': 'get_activity'}
        resp = requests.get(url, params=params, timeout=8)
        if not resp.ok:
            print(f"[Tautulli] API error: {resp.status_code}")
            return []
        data = resp.json()
        if data.get('response', {}).get('result') != 'success':
            print(f"[Tautulli] API not successful")
            return []
        sessions = data.get('response', {}).get('data', {}).get('sessions', [])
        activities = []
        for session in sessions:
            state = session.get('state', '').lower()
            activity_type = {
                'playing': 'watching', 'paused': 'paused', 'buffering': 'buffering'
            }.get(state, 'active')
            status_text = {
                'playing': '▶️ PLAYING', 'paused': '⏸️ PAUSED', 'buffering': '⏳ BUFFERING'
            }.get(state, '📺 ACTIVE')
            is_transcoding = any_transcoding(session)
            media_type = session.get('media_type', '').lower()
            if media_type in ['episode', 'show', 'tv']:
                series_title = session.get('grandparent_title') or session.get('show_name') or session.get('title', 'Unknown Series')
                episode_title = session.get('title', '')
                try:
                    season_num = int(session.get('parent_media_index', 0))
                    episode_num = int(session.get('media_index', 0))
                except (ValueError, TypeError):
                    season_num = episode_num = 0
                if season_num and episode_num:
                    episode_id = f"S{season_num:02d}E{episode_num:02d}"
                    title = series_title
                    subtitle_parts = [episode_id]
                    if episode_title:
                        subtitle_parts.append(episode_title)
                    subtitle = f"{session.get('user', 'Unknown User')} • {' - '.join(subtitle_parts)}"
                else:
                    title = series_title
                    subtitle = f"{session.get('user', 'Unknown User')} • {episode_title or 'Episode'}"
                if str(series_title).lower().startswith("unknown"):
                    continue
                year = session.get('year') or session.get('originally_available_at')
                tmdb_id, poster_path, nice_title = search_tmdb_tv(series_title, year)
                if poster_path:
                    poster_url = f"https://image.tmdb.org/t/p/w500{poster_path}"
                else:
                    poster_url = generate_fallback_poster(series_title, 'tautulli')
                if nice_title:
                    title = nice_title
            else:
                title = session.get('title', 'Unknown Title')
                if str(title).lower().startswith("unknown"):
                    continue
                subtitle = f"{session.get('user', 'Unknown User')} • {session.get('player', 'Unknown Player')}"
                year = session.get('year') or session.get('originally_available_at')
                tmdb_id, poster_path, nice_title = search_tmdb_movie(title, year)
                if poster_path:
                    poster_url = f"https://image.tmdb.org/t/p/w500{poster_path}"
                else:
                    poster_url = generate_fallback_poster(title, 'tautulli')
                if nice_title:
                    title = nice_title
            try:
                progress = int(float(session.get('progress_percent', 0)))
            except (ValueError, TypeError):
                progress = 0
            activities.append({
                'id': f"tautulli-{session.get('session_key', 'unknown')}",
                'type': activity_type,
                'title': title,
                'subtitle': subtitle,
                'user': session.get('user', 'Unknown'),
                'progress': progress,
                'poster': poster_url,
                'status': activity_type,
                'statusText': status_text,
                'timestamp': dt.now().isoformat(),
                'source': 'tautulli',
                'transcoding': is_transcoding
            })
        return activities
    except Exception as e:
        print(f"[Tautulli] Error: {e}")
        return []

@app.route("/api/jellyseerr/requests")
def jellyseerr_requests():
    return jsonify(get_jellyseerr_requests_data())

@app.route("/api/sonarr/queue")
def sonarr_queue():
    return jsonify(get_sonarr_queue_data())

@app.route("/api/radarr/queue")
def radarr_queue():
    return jsonify(get_radarr_queue_data())

@app.route("/api/tautulli/activity")
def tautulli_activity():
    return jsonify(get_tautulli_activity_data())

@app.route("/api/media/combined")
def combined_media_activity():
    try:
        all_activities = []
        all_activities.extend(get_tautulli_activity_data())
        all_activities.extend(get_jellyseerr_requests_data())
        all_activities.extend(get_sonarr_queue_data())
        all_activities.extend(get_radarr_queue_data())
        seen_ids = set()
        unique_activities = []
        for activity in all_activities:
            activity_id = activity.get('id')
            if activity_id and activity_id not in seen_ids:
                seen_ids.add(activity_id)
                unique_activities.append(activity)
        unique_activities.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        return jsonify(unique_activities[:20])
    except Exception as e:
        print(f"[Combined] Error: {e}")
        return jsonify([])

def main():
    print("Starting Media Activity API on http://0.0.0.0:5001")
    app.run(host="0.0.0.0", port=5001, debug=True)

if __name__ == "__main__":
    main()