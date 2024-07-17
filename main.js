async function getImages(imageURLs) {
	return new Promise((resolve, reject) => {
		var images = {};
		let imagesLoaded = 0;
		let failed = false;

		// go through each image
		for (let name in imageURLs) {
			let img = new Image();
			img.crossOrigin = "anonymous";
			
			img.onload = () => {
				images[name] = img;
				console.log(`image '${name}' loaded successfully`);
				imagesLoaded++;
				// check if all images have been loaded
				if (Object.keys(imageURLs).length == imagesLoaded) {
					if (!failed) {
						console.log("all images loaded successfully");
						resolve(images);
					} else {
						reject("one or more images failed to load");
					}
				}
			};
			img.onerror = () => {
				// this makes the function error out when it finishes
				failed = true;
				console.error(`image '${name}' failed to load`);
				imagesLoaded++;
			};

			// this line officially sends the http request to get the image
			img.src = imageURLs[name];
		}
	});	
}

// main code execution
(async function() {
	let imageURLs = {
		bayer: "textures/bayer.png",
		gamercat: "textures/gamercat.png"
	}; 
	images = await getImages(imageURLs);

	init();
})();