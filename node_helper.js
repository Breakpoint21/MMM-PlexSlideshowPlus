/* global Module */

/* MMM-PlexSlideshow.js
 *
 * Magic Mirror
 * Module: MMM-PlexSlideshow - Modifications by Peter Tewkesbury, Original code by Adam Moses and Darick Carpenter.
 *
 * Magic Mirror By Michael Teeuw http://michaelteeuw.nl
 * MIT Licensed.
 *
 * Based Module MMM-BackgroundSlideShow by Darick Carpenter
 * and that is based on MMM-ImageSlideShow by Adam Moses
 * MIT Licensed.
 */

// call in the required classes
var NodeHelper = require('node_helper');
var PlexAPI = require("plex-api");
var api = null;

// the main module helper create
module.exports = NodeHelper.create({
  // subclass start method, clears the initial config array
  start: function () {
    //this.moduleConfigs = [];
  },
  // shuffles an array at random and returns it
  shuffleArray: function (array) {
    var currentIndex = array.length,
      temporaryValue,
      randomIndex;
    while (0 !== currentIndex) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }
    return array;
  },

  gatherPlexImageList: function (config) {

    if (api === null) {
      var options = {
        hostname: config.plex.hostname !== null ? config.plex.hostname : "localhost",
        port: config.plex.port ? config.plex.port : 32400
      };

      if (typeof config.plex.apiToken !== 'undefined' && config.plex.apiToken !== null){
        options.token = config.plex.apiToken;
      }
      else{
        options.username = config.plex.username;
        options.password = config.plex.password;
      }

      console.log("Create PLEX Client : ", options);
      api = new PlexAPI(options);
      console.log("PLEX Client created");
    }

    var self = this;
    var imageList = [];
    return new Promise((resolve, reject) => {
      // Get list of playlists
      api.query('/playlists').then(function (playlistsResponse) {
        // Find playlist of photos which is Favorites
        var playlist = playlistsResponse.MediaContainer.Metadata.find(x => (x.specialPlaylistType == "favorites" && x.playlistType == "photo"));

        // Get all items in playlist
        api.query(playlist.key).then(function (playlistResponse) {
          playlistResponse.MediaContainer.Metadata.forEach(e => {
            // Get Url to each item and save
            var url = `http://${config.plex.hostname}:${config.plex.port}${e.Media[0].Part[0].key}?X-Plex-Token=${api.authToken}`;
            var orientation = e.Media[0].Part[0].orientation;
            imageList.push({
              url: url,
              orientation: orientation
            });
          });
          return resolve(imageList);
        });
      });
    });
  },
  // subclass socketNotificationReceived, received notification from module
  socketNotificationReceived: function (notification, payload) {
    if (notification === 'BACKGROUNDSLIDESHOW_REGISTER_CONFIG') {
      // this to self
      var self = this;

      // get the image list
      var imageList = [];
      this.gatherPlexImageList(payload).then((r) => {
        imageList = r;
        if (payload.randomizeImageOrder) {
          imageList = this.shuffleArray(imageList);
        }

        // build the return payload
        var returnPayload = {
          identifier: payload.identifier,
          imageList: imageList
        };
        // send the image list back
        self.sendSocketNotification(
          'BACKGROUNDSLIDESHOW_FILELIST',
          returnPayload
        );
      });
    }
  }
});

//------------ end -------------
