/* global Module */

/* MMM-PlexSlideshowPlus.js
 *
 * Magic Mirror
 * Module: MMM-PlexSlideshowPlus - Modifications by Pascal Schumann, Original code by Peter Tewkesbury, Adam Moses and Darick Carpenter.
 *
 * Magic Mirror By Michael Teeuw http://michaelteeuw.nl
 * MIT Licensed.
 *
 * Based Module MMM-PlexSlideshow by Peter Tewkesbury
 */

Module.register("MMM-PlexSlideshowPlus", {
	// Default module config.
	defaults: {
		plex: {
			hostname: "localhost",
			port: 32400,
			apiToken: ""
		},
		// the speed at which to switch between images, in milliseconds
		slideshowSpeed: 10 * 1000,
		// if true randomize image order, otherwise do alphabetical
		randomizeImageOrder: false,
		// transition speed from one image to the other, transitionImages must be true
		transitionSpeed: "1s",
		// the sizing of the background image
		// cover: Resize the background image to cover the entire container, even if it has to stretch the image or cut a little bit off one of the edges
		// contain: Resize the background image to make sure the image is fully visible
		backgroundSize: "cover", // cover or contain
		maxHeight: "",
		offsetTop: "",
		// transition from one image to the other (may be a bit choppy on slower devices, or if the images are too big)
		transitionImages: false,
		// the gradient to make the text more visible
		gradient: [
			"rgba(0, 0, 0, 0.75) 0%",
			"rgba(0, 0, 0, 0) 40%",
			"rgba(0, 0, 0, 0) 80%",
			"rgba(0, 0, 0, 0.75) 100%"
		],
		horizontalGradient: [
			"rgba(0, 0, 0, 0.75) 0%",
			"rgba(0, 0, 0, 0) 40%",
			"rgba(0, 0, 0, 0) 80%",
			"rgba(0, 0, 0, 0.75) 100%"
		],
		// the direction the gradient goes, vertical or horizontal
		gradientDirection: "vertical"
	},
	// load function
	start: function () {
		// add identifier to the config
		this.config.identifier = this.identifier;
		// set no error
		this.errorMessage = null;
		if (this.config.plex.hostname.length == 0 || this.config.plex.apiToken.length == 0) {
			this.errorMessage =
				"MMM-PlexSlideshowPlus: Missing required parameter - hostname | apiToken.";
		} else {
			this.browserSupportsExifOrientationNatively = CSS.supports(
				'image-orientation: from-image'
			);
			this.imageList = [];
			this.imageIndex = 0;
			this.updateImageList();
		}
	},
	// Define required scripts.
	getStyles: function () {
		// the css contains the make grayscale code
		return ["PlexSlideshowPlus.css"];
	},
	// generic notification handler
	notificationReceived: function (notification, payload, sender) {
		if (sender) {
			// Log.log(this.name + " received a module notification: " + notification + " from sender: " + sender.name);
			if (notification === "BACKGROUNDSLIDESHOW_IMAGE_UPDATE") {
				Log.log("MMM-PlexSlideshowPlus: Changing Background");
				this.suspend();
				this.updateImage();
				this.resume();
			}
			else if (notification === "BACKGROUNDSLIDESHOW_NEXT") { // Change to next image
				this.updateImage();
				if (this.timer) { // Restart timer only if timer was already running
					this.resume();
				}

			}
			else if (notification === "BACKGROUNDSLIDESHOW_PLAY") { // Change to next image and start timer.
				this.updateImage();
				this.resume();
			}
			else if (notification === "BACKGROUNDSLIDESHOW_PAUSE") { // Stop timer.
				this.suspend();
			}
			else {
				// Log.log(this.name + " received a system notification: " + notification);
			}
		}
	},
	// the socket handler
	socketNotificationReceived: function (notification, payload) {
		// if an update was received
		if (notification === "BACKGROUNDSLIDESHOW_FILELIST") {
			// check this is for this module based on the woeid
			if (payload.identifier === this.identifier) {
				// console.info('Returning Images, payload:' + JSON.stringify(payload));
				// set the image list
				this.imageList = payload.imageList;
				// if image list actually contains images
				// set loaded flag to true and update dom
				if (this.imageList.length > 0) {
					this.updateImage(); //Added to show the image at least once, but not change it within this.resume()
					this.resume();
				}
			}
		}
	},
	// Override dom generator.
	getDom: function () {
		var wrapper = document.createElement("div");
		this.div1 = this.createDiv("big1");
		this.div2 = this.createDiv("big2");

		wrapper.appendChild(this.div1);
		wrapper.appendChild(this.div2);

		if (
			this.config.gradientDirection === "vertical" ||
			this.config.gradientDirection === "both"
		) {
			this.createGradientDiv("bottom", this.config.gradient, wrapper);
		}

		if (
			this.config.gradientDirection === "horizontal" ||
			this.config.gradientDirection === "both"
		) {
			this.createGradientDiv("right", this.config.gradient, wrapper);
		}

		return wrapper;
	},

	createGradientDiv: function (direction, gradient, wrapper) {
		var div = document.createElement("div");
		div.style.backgroundImage =
			"linear-gradient( to " + direction + ", " + gradient.join() + ")";
		div.className = "gradient";
		wrapper.appendChild(div);
	},

	createDiv: function (name) {
		var div = document.createElement("div");
		div.id = name + this.identifier;
		div.style.backgroundSize = this.config.backgroundSize;
		if (this.config.maxHeight) {
			div.style.maxHeight = this.config.maxHeight;
		}
		if (this.config.offsetTop) {
			div.style.top = this.config.offsetTop;
		}
		div.style.transition =
			"opacity " + this.config.transitionSpeed + " ease-in-out";
		div.className = "image";
		return div;
	},

	updateImage: function () {
		if (this.imageList && this.imageList.length) {
			if (this.imageIndex < this.imageList.length) {
				if (this.config.transitionImages) {
					this.swapDivs();
				}
				var div1 = this.div1;
				var div2 = this.div2;

				var image = new Image();
				image.onload = function () {
					var o = image.orientation;
					console.log("Image : " + image.src);
					console.log("Orientation : " + image.orientation);

					var imageTransformCss = "rotate(0deg)";
					if (o == 2) {
						imageTransformCss = "scaleX(-1)";
					} else if (o == 3) {
						imageTransformCss = "scaleX(-1) scaleY(-1)";
					} else if (o == 4) {
						imageTransformCss = "scaleY(-1)";
					} else if (o == 5) {
						imageTransformCss = "scaleX(-1) rotate(90deg)";
					} else if (o == 6) {
						imageTransformCss = "rotate(90deg)";
					} else if (o == 7) {
						imageTransformCss = "scaleX(-1) rotate(-90deg)";
					} else if (o == 8) {
						imageTransformCss = "rotate(-90deg)";
					}
					if (!this.browserSupportsExifOrientationNatively) {
						div1.style.transform = imageTransformCss;
					}

					div1.style.backgroundImage = "url('" + image.src + "')";
					div1.style.opacity = "1";
					div2.style.opacity = "0";
				};
				var i = this.imageList[this.imageIndex];

				image.src = encodeURI(i.url);
				image.orientation = i.orientation;
				this.sendNotification("BACKGROUNDSLIDESHOW_IMAGE_UPDATED", { url: image.src });
				this.imageIndex += 1;
			} else {
				this.imageIndex = 0;
				this.updateImageList();
			}
		}
	},

	swapDivs: function () {
		var temp = this.div1;
		this.div1 = this.div2;
		this.div2 = temp;
	},

	suspend: function () {
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = null;
		}
	},
	resume: function () {
		//this.updateImage(); //Removed to prevent image change whenever MMM-Carousel changes slides
		this.suspend();
		var self = this;
		this.timer = setInterval(function () {
			self.updateImage();
		}, self.config.slideshowSpeed);
	},
	updateImageList: function () {
		this.suspend();
		// console.info('Getting Images');
		// ask helper function to get the image list
		this.sendSocketNotification(
			"BACKGROUNDSLIDESHOW_REGISTER_CONFIG",
			this.config
		);
	}
});

