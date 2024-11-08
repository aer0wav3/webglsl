async function getImages(imageURLs) {
	if (Object.keys(imageURLs).length == 0) reject(new Error("no images to load"))

	return new Promise((resolve, reject) => {
		var images = {};
		let imagesLoaded = 0;

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
					console.log("all images loaded successfully");
					return resolve(images);
				}
			};
			img.onerror = (e) => {
				// this usually occurs when the image fails CORS (the enemy of the state)
				return reject(new Error(`image '${name}' failed to load`));
			};

			// this line officially sends the http request to get the image
			img.src = imageURLs[name];
		}
	});	
}

// main code execution
(async function() {
	try {
		let imageURLs = {
			bayer: "textures/bayer.png",
			gamercat: "textures/gamercat.png"
		}; 
		images = await getImages(imageURLs);

		init();
	} catch {
		// this is usually caused by opening the html file as a local file, not having it hosted on a url
		console.warn("failed to load local images, retrying with external links");
		
		// but!!! we can use backup urls that DO work on a local file
		try {
			let imageURLs = {
				bayer: "https://raw.githubusercontent.com/tromero/BayerMatrix/refs/heads/master/images/bayer16.png",
				gamercat: "https://raw.githubusercontent.com/aer0wav3/webglsl/refs/heads/main/textures/gamercat.png"
			}; 
			images = await getImages(imageURLs);
	
			init();
		} catch {
			// now this is a problem for future me <3
			console.error("failed to load images... you must be offline")
			alert("failed to load resources")
		}
		
	}
})();
