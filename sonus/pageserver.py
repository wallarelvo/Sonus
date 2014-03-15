
import config
from flask import Response, jsonify, render_template, request, g
import os
<< << << < HEAD
from db import DB

== == == =
import time
import db
from threading import Timer
>>>>>> > 5f4f200938d1dd9152f35d544f9ade362de2569b
MIME_DICT = {
    "js": "text/javascript",
    "css": "text/css",
    "imgs": "image/png",
    "libraries": "text/javascript",
    "data": "text/csv",
    "sounds":  "audio/vnd.wav"
}

STATIC_DIR = "static/"


def get_db():
    if not hasattr(g, "db"):
        g.db = DB()
        g.db.connect()

    return g.db


@config.app.route("/<file_type>/<filename>", methods=["GET"])
def get_static(file_type, filename):
    with open(STATIC_DIR + file_type + "/" + filename) as f:
        res = Response(f.read(), mimetype=MIME_DICT[file_type])
        return res


@config.app.route("/", methods=["GET"])
def get_index():
    return render_template(
        "index.html"
    )


@config.app.route("/song", methods=["POST"])
def song():
    db = get_db()

    userId = request.form.get('userId')
    songId = request.form.get('songId')
    latitude = request.form.get('latitude')
    longitude = request.form.get('longitude')

    song = db.DB.find_song({'songId': songId})
    song = song or db.DB.add_song({'songId': songId})
    now = song.setdefault('now', {})
    songObj = {'userId': userId,
               'location': {'latitude': latitude,
                            'longitude': longitude},
               'time': time.time()}
    now[userId] = songObj
    t = Timer(200.0, remove, [songObj, songId])
    t.start()

    total = song.setdefault('total', {})
    total[userId] = songObj
    return jsonify({'status': 'ok'})


@config.app.route("/desong", methods=["POST"])
def desong():
    userId = request.form.get('userId')
    songId = request.form.get('songId')

    song = db.DB.find_song({'songId': songId})
    if userId in song['now'].keys():
        del song['now'][userId]


def remove(songObj):
    db = get_db()
    song = db.find_song({'songId': songId})
    if songObj['userId'] in song['now'].keys():
        del song['now'][songObj['userId']]
