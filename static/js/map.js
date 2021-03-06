            $(document).ready(function() {

                var map;
                var curr_info_window = null;
                var map_bounds = new google.maps.LatLngBounds(null);
                var heatmaps = [];
                var markers = [];
                var genre_index = 0;


                function error(msg) {
                    console.log(msg);
                }

                function getLocation() {
                    if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(initialize, error);
                    }
                }

                function initialize_genres(data) {
                    /* clear existing heatmaps */
                    removeMarkers();
                    removeHeatmaps();

                    /* add a marker for every user */
                    var songs = data.songs;
                    var user_list = [];

                    console.log(data);

                    songs.forEach(function(song) {
                        var users = song.total;
                        var songId = song["songId"];
                        SC.get("/tracks/" + songId, function (scData) {
                            users.forEach(function(user) {
                                var coord = [user.location.latitude, user.location.longitude];
                                addMarker(
                                    coord,
                                    map,
                                    scData["title"],
                                    "",
                                    song.genre,
                                    scData["artwork_url"],
                                    0
                                );

                                user_list.push(user);
                            });
                            /* add heatmap for a particular genre */
                            addHeatmap(
                                map,
                                user_list,
                                0
                            );

                            map.initialZoom = true;
                            map.fitBounds(map_bounds);
                            var listener = google.maps.event.addListener(map, "idle", function() {
                                if (map.getZoom() > 18) map.setZoom(18);
                                    google.maps.event.removeListener(listener);
                            });

                        });
                    });


                }

                function initialize(position) {
                    var coord = new google.maps.LatLng(
                        position.coords.latitude,
                        position.coords.longitude
                    );
                    var mapOptions = {
                        zoom: 13,
                        center: coord,
                        mapTypeId: google.maps.MapTypeId.SATELLITE
                    };

                    map = new google.maps.Map(
                        document.getElementById('map-canvas'),
                        mapOptions
                    );
                }

                /* HEATMAP FUNCTIONS */
                function addHeatmap(map, users, index) {
                    var gradient = heatmapGradient(index);
                    var points = [];

                    users.forEach(function(user) {
                        coord = [user.location.latitude, user.location.longitude];
                        point = new google.maps.LatLng(coord[0], coord[1]);
                        points.push(point);
                    });

                    var heatmap = new google.maps.visualization.HeatmapLayer({
                        data: new google.maps.MVCArray(points)
                    });

                    heatmap.setMap(map);
                    heatmap.set('gradient', heatmap.get('gradient') ? null : gradient);
                    heatmap.set('radius', heatmap.get('radius') ? null : 20);

                    /* add to heatmaps list */
                    heatmaps.push(heatmap);

                    return heatmap;
                }

                function removeHeatmaps() {
                    heatmaps.forEach(function(heatmap) {
                        heatmap.setMap(null);
                    });
                }

                function heatmapGradient(index) {
                    switch(index) {
                    case 0:
                        /* RED -> YELLOW  */
                        return [
                            'rgba(0, 255, 255, 0)',
                            'rgb(255, 255, 0)',
                            'rgb(255, 229, 0)',
                            'rgb(255, 204, 0)',
                            'rgb(255, 178, 0)',
                            'rgb(255, 153, 0)',
                            'rgb(255, 127, 0)',
                            'rgb(255, 102, 0)',
                            'rgb(255, 76, 0)',
                            'rgb(255, 51, 0)',
                            'rgb(255, 25, 0)',
                            'rgb(255, 0, 0)'
                        ];

                    case 1:
                        /* PURPLE -> GREEN */
                        return [
                            'rgba(0, 255, 255, 0)',
                            'rgb(51, 255, 0)',
                            'rgb(56, 235, 26)',
                            'rgb(61, 214, 51)',
                            'rgb(66, 194, 77)',
                            'rgb(71, 173, 102)',
                            'rgb(77, 153, 128)',
                            'rgb(82, 133, 153)',
                            'rgb(87, 112, 179)',
                            'rgb(92, 92, 204)',
                            'rgb(97, 71, 230)',
                            'rgb(102, 51, 255)'
                        ];

                    case 2:
                        /* PINK -> LIGHT PINK */
                        return [
                            'rgba(255, 255, 255, 0)',
                            'rgb(255, 204, 255)',
                            'rgb(255, 184, 255)',
                            'rgb(255, 163, 255)',
                            'rgb(255, 143, 255)',
                            'rgb(255, 122, 255)',
                            'rgb(255, 102, 255)',
                            'rgb(255, 82, 255)',
                            'rgb(255, 61, 255)',
                            'rgb(255, 41, 255)',
                            'rgb(255, 20, 255)',
                            'rgb(255, 0, 255)'
                        ];

                    case 3:
                        /* BLUE -> SKY BLUE */
                        return [
                            'rgba(0, 255, 255, 0)',
                            'rgb(204, 255, 255)',
                            'rgb(184, 230, 255)',
                            'rgb(163, 204, 255)',
                            'rgb(143, 179, 255)',
                            'rgb(122, 153, 255)',
                            'rgb(102, 128, 255)',
                            'rgb(82, 102, 255)',
                            'rgb(61, 77, 255)',
                            'rgb(41, 51, 255)',
                            'rgb(20, 26, 255)',
                            'rgb(0, 0, 255)'
                        ]
                    }
                }

                function toggleHeatmaps() {
                    heatmaps.forEach(function(heatmap) {
                        heatmap.setMap(heatmap.getMap() ? null : map);
                    });
                }

                function changeRadius() {
                    heatmaps.forEach(function(heatmap) {
                        heatmap.set('radius', heatmap.get('radius') ? null : 60);
                    });
                }

                function changeOpacity() {
                    heatmaps.forEach(function(heatmap) {
                        heatmap.set('opacity', heatmap.get('opacity') ? null : 0.2);
                    });
                }


                /* MARKER FUNCTIONS */
                function addMarker(coord, map, album, artist, genre, image, index) {
                    var info_window = new google.maps.InfoWindow({
                        content:
                            "<div class='map-info'>"
                                + "<ul>"
                                    + "<li class='map-icon'>"
                                        + "<img src='" + image + "'></img>"
                                    + "</li>"
                                    + "<li class='map-album'>" + album + "</li>"
                                    + "<li class='map-artist'>" + artist + "</li>"
                                    + "<li class='map-genre'>[" + genre + "]</li>"
                                + "</ul>"
                            + "</div>"
                    });

                    var marker = new google.maps.Marker({
                        position: new google.maps.LatLng(coord[0], coord[1]),
                        map: map,
                        title: album,
                        icon: markerColor(index)
                    });

                    /* click listener */
                    google.maps.event.addListener(marker, 'click', function() {
                        if (curr_info_window != null) {
                            curr_info_window.close();
                        }

                        info_window.open(map, marker);
                        curr_info_window = info_window;
                    });

                    /* add to markers list */
                    markers.push(marker);
                    map_bounds.extend(new google.maps.LatLng(coord[0], coord[1]));
                }

                function removeMarkers() {
                    markers.forEach(function(marker) {
                        marker.setMap(null);
                    });

                }

                function toggleMarkers() {
                    markers.forEach(function(marker) {
                        marker.setMap(marker.getMap() ? null : map);
                    });
                }

                function markerColor(index) {
                    switch(index) {
                    case 0:
                        /* RED */
                        return "http://maps.google.com/mapfiles/ms/icons/red-dot.png";

                    case 1:
                        /* PURPLE */
                        return "http://maps.google.com/mapfiles/ms/icons/purple-dot.png";

                    case 2:
                        /* PINK */
                        return "http://maps.google.com/mapfiles/ms/icons/pink-dot.png";

                    case 3:
                        /* BLUE */
                        return "http://maps.google.com/mapfiles/ms/icons/blue-dot.png";
                    }
                }

               getLocation();
                $('#map-canvas').hide();
                   SC.initialize({
                       client_id: '0020643627fb540d480f7c4434796d2c'
                   });
                   if (!("autofocus" in document.createElement("input"))) {
                       $("#search").focus();
                   }
                   $("#mapform").on("submit", function(event) {
                    $('#resultsTable').hide();
                    $('#map-canvas').show();
                    google.maps.event.trigger(map, "resize");


                       console.log($("#mapquery").val());
                       $.ajax({
                           type: "POST",
                           data: {
                               search_term: $("#mapquery").val()
                           },
                           url: "/map/genres",
                           success: function(data) {
                               initialize_genres(data);
                           }
                       });
                           $("#mapquery").val("");
                       return false;

               });





            });
