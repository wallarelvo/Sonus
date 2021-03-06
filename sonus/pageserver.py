
import config
from flask import Response, jsonify, render_template, request, g
import os
import json
from geopy import distance
from geopy import Point
from db import DB
import threading
import re

    #continue doing stuff
import time
import urllib2

import threading

MIME_DICT = {
    "js": "text/javascript",
    "css": "text/css",
    "imgs": "image/png",
    "libraries": "text/javascript",
    "data": "text/csv",
    "sounds":  "audio/vnd.wav",
    "fonts": "font/opentype"
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
    return render_template("index.html")


@config.app.route("/map")
def map():
    return render_template("map.html")


@config.app.route("/song", methods=["POST"])
def song():
    db = get_db()
    userId = request.form.get('userId')
    songId = request.form.get('songId')
    genre = request.form.get('genre')
    latitude = request.form.get('latitude')
    longitude = request.form.get('longitude')
    song = db.find_song({'songId': songId}) or db.add_song({'songId': songId})

    # make sure user has location data else pointless adding him
    if len(latitude) > 0 and len(longitude) > 0:
        user = {
            'userId': userId,
            'location': {
                'latitude': latitude,
                'longitude': longitude
            },
            'time': time.time()
        }

        # create song dict
        song = {"songId": songId, "genre": genre}
        song.setdefault('now', []).append(user)
        song.setdefault('total', []).append(user)

        # update song details (i.e. "now" and "total" fields)
        db.update_song({"songId": songId}, song)

        # remove user from now after certain time
        t = threading.Timer(1000.0, remove_user_from_now, [userId, songId])
        t.start()

    return jsonify({'status': 'ok'})


@config.app.route("/desong", methods=["POST"])
def desong():
    # form
    userId = request.form.get('userId')
    songId = request.form.get('songId')

    # remove user from "now" field in song
    remove_user_from_now(userId, songId)

    return jsonify({'status': 'ok'})


def remove_user_from_now(userId, songId):
    db = get_db()

    # find the song to remove
    song = db.find_song({'songId': songId})

    # remove user from song["now"]
    for user in song['now']:
        if user["userId"] == userId:
            song['now'].remove(user)
    song.pop("_id")

    # update
    db.update_song({"songId": song["songId"]}, song)


@config.app.route("/purge", methods=["GET"])
def purge():
    db = get_db()
    db.songs.remove()
    db.users.remove()
    return jsonify({'status': 'ok'})


def fbData(authToken):
    musicListens="https://graph.facebook.com/me?fields=music.listens&access_token="+authToken
    checkins="https://graph.facebook.com/me?fields=checkins.fields(coordinates,created_time)&access_token="+authToken
    friendsListens="https://graph.facebook.com/me?fields=friends.limit(100).fields(music.listens.fields(data))&access_token="+authToken
    friendsCheckins="https://graph.facebook.com/me?fields=friends.limit(100).fields(checkins.fields(coordinates,created_time))&access_token="+authToken

    musicListens=json.load(urllib2.urlopen(musicListens))
    checkins=json.load(urllib2.urlopen(checkins))
    print musicListens.keys()

    #print json.load(urllib2.urlopen(friendsListens).read()
    #print json.load(urllib2.urlopen(friendsCheckins).read()


@config.app.route("/authToken", methods=["POST"])
def authToken():
    authToken = request.form.get('authToken')
    func = threading.Thread(target=fbData, args=[authToken])
    func.start()

    return jsonify({'status': 'ok'})


@config.app.route("/near/<latitude>/<longitude>/<radius>")
def near(latitude, longitude, radius):
    db = get_db()

    # get list of songs
    songs = db.find_songs({})
    songs = [i for i in songs]

    print "LOCATION:", latitude, longitude

    # loop through every song
    results = []
    for song in songs:
        # loop through "total" array
        for user in song.get("total", []):
            x = str(latitude) + "," + str(longitude)
            y = (
                str(user["location"]["latitude"])
                + ","
                + str(user["location"]["longitude"])
            )

            if len(x) > 1 and len(y) > 1:  # 1 because of comma
                p1 = Point(x)
                p2 = Point(y)

                # check to see if song is within radius
                dist = distance.distance(p1, p2).kilometers
                if dist <= float(radius):
                    song.pop("_id")
                    results.append(song)
                    break

    return jsonify({"songs": results})


@config.app.route("/map/genres", methods=["POST"])
def get_genre():
    results = []
    db = get_db()
    search_term = request.form.get('search_term', None)
    print "SEARCH TERM", search_term

    # aggregate songs of a particular genre
    if search_term:
        songs = db.find_songs({
            "$or": [
                {"songId": re.compile(search_term, re.IGNORECASE)},
                {"genre": re.compile(search_term, re.IGNORECASE)},
            ]
        })
        print songs
        for song in songs:
            song.pop("_id")  # very important, since "_id" is not serializable
            results.append(song)

    return jsonify({"songs": results})
