async function getImages(imageURLs) {
	if (Object.keys(imageURLs).length == 0) throw new Error("no images to load");

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