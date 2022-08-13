var mapView;

$(function() {

	var completed_requests = 0;

	var map = null;
	var draw = null;
	var geocoder = null;
	var bar = null;

	var cancellationToken = null;
	var requests = [];

	var sources = {

		"Transport Map": "https://b.tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=6170aad10dfd42a38d4d8c709a536f38",

		"Bing Maps": "http://ecn.t0.tiles.virtualearth.net/tiles/r{quad}.jpeg?g=129&mkt=en&stl=H",
		"Bing Maps Satellite": "http://ecn.t0.tiles.virtualearth.net/tiles/a{quad}.jpeg?g=129&mkt=en&stl=H",
		"Bing Maps Hybrid": "http://ecn.t0.tiles.virtualearth.net/tiles/h{quad}.jpeg?g=129&mkt=en&stl=H",

		"div-1B": "",

		"Google Maps": "https://mt0.google.com/vt?lyrs=m&x={x}&s=&y={y}&z={z}",
		"Google Maps Satellite": "https://mt0.google.com/vt?lyrs=s&x={x}&s=&y={y}&z={z}",
		"Google Maps Hybrid": "https://mt0.google.com/vt?lyrs=h&x={x}&s=&y={y}&z={z}",
		"Google Maps Terrain": "https://mt0.google.com/vt?lyrs=p&x={x}&s=&y={y}&z={z}",

		"div-2": "",

		"Open Street Maps": "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
		"Open Cycle Maps": "http://a.tile.opencyclemap.org/cycle/{z}/{x}/{y}.png",
		"Open PT Transport": "http://openptmap.org/tiles/{z}/{x}/{y}.png",

		"div-3": "",

		"ESRI World Imagery": "http://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
		"Wikimedia Maps": "https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png",
		"NASA GIBS": "https://map1.vis.earthdata.nasa.gov/wmts-webmerc/MODIS_Terra_CorrectedReflectance_TrueColor/default/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg",

		"div-4": "",

		"Carto Light": "http://cartodb-basemaps-c.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png",
		"Stamen Toner B&W": "http://a.tile.stamen.com/toner/{z}/{x}/{y}.png",

	};

	function initializeMap() {
		mapboxgl.accessToken = 'pk.eyJ1IjoiYWxpYXNocmFmIiwiYSI6ImNqdXl5MHV5YTAzNXI0NG51OWFuMGp4enQifQ.zpd2gZFwBTRqiapp1yci9g';
		map = new mapboxgl.Map({
			container: 'map-view',
			// style: 'mapbox://styles/mapbox/light-v10',
			style: {
				"version": 8,
				"sources": {
					"osm": {
						"type": "raster",
						"tiles": [
							"http://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
							"http://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
							"http://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
						],
						"tileSize": 256,
						"attribution": "OpenStreetMap"
					},
					"transport-map": {
						"type": "raster",
						"tiles": [
							"https://a.tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=6170aad10dfd42a38d4d8c709a536f38",
							"https://b.tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=6170aad10dfd42a38d4d8c709a536f38",
							"https://c.tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=6170aad10dfd42a38d4d8c709a536f38"
						],
						"tileSize": 256,
						"attribution": "OpenStreetMap"
					},
				},
				'layers': [
					{
						'id': 'simple-tiles',
						'type': 'raster',
						'source': 'transport-map',
						'minzoom': 0,
						'maxzoom': 22
					}
				]
			},
			center: [130.6700, 33.5437],
			zoom: 9
		});

		geocoder = new MapboxGeocoder({ accessToken: mapboxgl.accessToken });
		var control = map.addControl(geocoder);
	}

	function initializeMaterialize() {
		$('select').formSelect();
		$('.dropdown-trigger').dropdown({
			constrainWidth: false,
		});
	}

	function initializeSources() {

		var dropdown = $("#sources");

		for(var key in sources) {
			var url = sources[key];

			if(url == "") {
				dropdown.append("<hr/>");
				continue;
			}

			var item = $("<li><a></a></li>");
			item.attr("data-url", url);
			item.find("a").text(key);

			item.click(function() {
				var url = $(this).attr("data-url");
				$("#source-box").val(url);
			})

			dropdown.append(item);
		}
	}

	function initializeSearch() {
		$("#search-form").submit(function(e) {
			var location = $("#location-box").val();
			geocoder.query(location);

			e.preventDefault();
		})
	}

	function initializeMoreOptions() {

		$("#more-options-toggle").click(function() {
			$("#more-options").toggle();
		})

		var outputFileBox = $("#output-file-box")
		$("#output-type").change(function() {
			var outputType = $("#output-type").val();
			if(outputType == "mbtiles") {
				outputFileBox.val("tiles.mbtiles")
			} else if(outputType == "repo") {
				outputFileBox.val("tiles.repo")
			} else if(outputType == "directory") {
				outputFileBox.val("{z}/{x}/{y}.png")
			}
		})

	}

	function initializePolygonTool() {
		draw = new MapboxDraw(
		{
			displayControlsDefault: false,
			controls: {
				polygon: true,
				trash: true
			},
			defaultMode: 'draw_polygon'
		});
		map.addControl(draw);

		map.on('draw.create', function(e) {
			M.Toast.dismissAll();
		});

		$("#boundary-draw-button").click(function() {
			startDrawing();
		});


	}

	function startDrawing() {
		removeGrid();
		draw.deleteAll();
		draw.changeMode('draw_polygon');

		M.Toast.dismissAll();
		M.toast({html: 'Select an area to download', displayLength: 7000})
	}


	function zoomMapTo(level) {
		map.setZoom(level);
	}
	function initializeGridPreview() {
		$("#grid-preview-button").click(previewGrid);
		$("#map-zoom-0").click(function() { zoomMapTo(0); });
		$("#map-zoom-1").click(function() { zoomMapTo(1); });
		$("#map-zoom-2").click(function() { zoomMapTo(2); });
		$("#map-zoom-3").click(function() { zoomMapTo(3); });
		$("#map-zoom-4").click(function() { zoomMapTo(4); });
		$("#map-zoom-5").click(function() { zoomMapTo(5); });
		$("#map-zoom-6").click(function() { zoomMapTo(6); });
		$("#map-zoom-7").click(function() { zoomMapTo(7); });
		$("#map-zoom-8").click(function() { zoomMapTo(8); });
		$("#map-zoom-9").click(function() { zoomMapTo(9); });
		$("#map-zoom-10").click(function() { zoomMapTo(10); });
		$("#map-zoom-11").click(function() { zoomMapTo(11); });
		$("#map-zoom-12").click(function() { zoomMapTo(12); });
		$("#map-zoom-13").click(function() { zoomMapTo(13); });
		$("#map-zoom-14").click(function() { zoomMapTo(14); });
		$("#map-zoom-15").click(function() { zoomMapTo(15); });
		$("#map-zoom-16").click(function() { zoomMapTo(16); });
		$("#map-zoom-17").click(function() { zoomMapTo(17); });
		$("#map-zoom-18").click(function() { zoomMapTo(18); });
		$("#map-zoom-19").click(function() { zoomMapTo(19); });
		$("#map-zoom-20").click(function() { zoomMapTo(20); });

		map.on('click', showTilePopup);
	}

	function showTilePopup(e) {

		if(!e.originalEvent.ctrlKey) {
			return;
		}

		var maxZoom = getMaxZoom();

		var x = lat2tile(e.lngLat.lat, maxZoom);
		var y = long2tile(e.lngLat.lng, maxZoom);

		var content = "X, Y, Z<br/><b>" + x + ", " + y + ", " + maxZoom + "</b><hr/>";
		content += "Lat, Lng<br/><b>" + e.lngLat.lat + ", " + e.lngLat.lng + "</b>";

        new mapboxgl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(content)
            .addTo(map);

        console.log(e.lngLat)

	}

	function long2tile(lon,zoom) {
		return (Math.floor((lon+180)/360*Math.pow(2,zoom)));
	}

	function lat2tile(lat,zoom)  {
		return (Math.floor((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom)));
	}

	function tile2long(x,z) {
		return (x/Math.pow(2,z)*360-180);
	}

	function tile2lat(y,z) {
		var n=Math.PI-2*Math.PI*y/Math.pow(2,z);
		return (180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n))));
	}

	function getTileRect(x, y, zoom) {

		var c1 = new mapboxgl.LngLat(tile2long(x, zoom), tile2lat(y, zoom));
		var c2 = new mapboxgl.LngLat(tile2long(x + 1, zoom), tile2lat(y + 1, zoom));

		return new mapboxgl.LngLatBounds(c1, c2);
	}

	function getMinZoom() {
		return Math.min(parseInt($("#zoom-from-box").val()), parseInt($("#zoom-to-box").val()));
	}

	function getMaxZoom() {
		return Math.max(parseInt($("#zoom-from-box").val()), parseInt($("#zoom-to-box").val()));
	}

	function getArrayByBounds(bounds) {

		var tileArray = [
			[ bounds.getSouthWest().lng, bounds.getNorthEast().lat ],
			[ bounds.getNorthEast().lng, bounds.getNorthEast().lat ],
			[ bounds.getNorthEast().lng, bounds.getSouthWest().lat ],
			[ bounds.getSouthWest().lng, bounds.getSouthWest().lat ],
			[ bounds.getSouthWest().lng, bounds.getNorthEast().lat ],
		];

		return tileArray;
	}

	function getPolygonByBounds(bounds) {

		var tilePolygonData = getArrayByBounds(bounds);

		var polygon = turf.polygon([tilePolygonData]);

		return polygon;
	}

	function isTileInSelection(tileRect) {

		var polygon = getPolygonByBounds(tileRect);

		var areaPolygon = getCollection().features[0];
		// var areaPolygon = getKyushyuFeatureCollection().features[0];

		if(turf.booleanDisjoint(polygon, areaPolygon) == false) {
			return true;
		}

		return false;
	}

	function getCollection() {
		// return draw.getAll();
		// return getJapanFeatureCollection();
		// return getKyushyuFeatureCollection();
		// return getFukuokaAndSurroundingPrefectureFeatureCollection();
		// return getFukuokaFeatureCollection();
		return getKyushyuAndSurroundingIslandsFeatureCollection();

	  // Zoom 0-13 with getKyushyuAndSurroundingIslandsFeatureCollection - 11496 (About 2 hours)
		// Zoom 0-13 with getJapanFeatureCollection - 43253 (About 8 hours)
		// Zoom 14 with getKyushyuFeatureCollection - 19010 (About 3.5 hours)
		// Zoom 15 with getFukuokaAndSurroundingPrefectureFeatureCollection - 24334 (About 4.5 hours)
		// Zoom 16 with getFukuokaFeatureCollection - 23659 (About 4.5 hours)

	}

	function getBounds() {
		var coordinates = getCollection().features[0].geometry.coordinates[0];
		console.log(getCollection())

		var bounds = coordinates.reduce(function(bounds, coord) {
			return bounds.extend(coord);
		}, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

		return bounds;
	}

	function getGrid(zoomLevel) {

		var bounds = getBounds();

		var rects = [];

		var outputScale = $("#output-scale").val();
		//var thisZoom = zoomLevel - (outputScale-1)
		var thisZoom = zoomLevel

		var TY    = lat2tile(bounds.getNorthEast().lat, thisZoom);
		var LX   = long2tile(bounds.getSouthWest().lng, thisZoom);
		var BY = lat2tile(bounds.getSouthWest().lat, thisZoom);
		var RX  = long2tile(bounds.getNorthEast().lng, thisZoom);

		for(var y = TY; y <= BY; y++) {
			for(var x = LX; x <= RX; x++) {

				var rect = getTileRect(x, y, thisZoom);

				if(isTileInSelection(rect)) {
					rects.push({
						x: x,
						y: y,
						z: thisZoom,
						rect: rect,
					});
				}

			}
		}

		return rects
	}

	function getAllGridTiles() {
		var allTiles = [];

		for(var z = getMinZoom(); z <= getMaxZoom(); z++) {
			var grid = getGrid(z);
			// TODO shuffle grid via a heuristic (hamlet curve? :/)
			allTiles = allTiles.concat(grid);
		}

		return allTiles;
	}

	function removeGrid() {
		removeLayer("grid-preview");
	}

	function previewGrid() {

		var maxZoom = getMaxZoom();
		var grid = getGrid(maxZoom);

		var pointsCollection = []

		for(var i in grid) {
			var feature = grid[i];
			var array = getArrayByBounds(feature.rect);
			pointsCollection.push(array);
		}

		removeGrid();

		map.addLayer({
			'id': "grid-preview",
			'type': 'line',
			'source': {
				'type': 'geojson',
				'data': turf.polygon(pointsCollection),
			},
			'layout': {},
			'paint': {
				"line-color": "#fa8231",
				"line-width": 3,
			}
		});

		var totalTiles = getAllGridTiles().length;
		M.toast({html: 'Total ' + totalTiles.toLocaleString() + ' tiles in the region.', displayLength: 5000})

	}

	function previewRect(rectInfo) {

		var array = getArrayByBounds(rectInfo.rect);

		var id = "temp-" + rectInfo.x + '-' + rectInfo.y + '-' + rectInfo.z;

		map.addLayer({
			'id': id,
			'type': 'line',
			'source': {
				'type': 'geojson',
				'data': turf.polygon([array]),
			},
			'layout': {},
			'paint': {
				"line-color": "#ff9f1a",
				"line-width": 3,
			}
		});

		return id;
	}

	function removeLayer(id) {
		if(map.getSource(id) != null) {
			map.removeLayer(id);
			map.removeSource(id);
		}
	}

	function generateQuadKey(x, y, z) {
	    var quadKey = [];
	    for (var i = z; i > 0; i--) {
	        var digit = '0';
	        var mask = 1 << (i - 1);
	        if ((x & mask) != 0) {
	            digit++;
	        }
	        if ((y & mask) != 0) {
	            digit++;
	            digit++;
	        }
	        quadKey.push(digit);
	    }
	    return quadKey.join('');
	}

	function initializeDownloader() {

		bar = new ProgressBar.Circle($('#progress-radial').get(0), {
			strokeWidth: 12,
			easing: 'easeOut',
			duration: 200,
			trailColor: '#eee',
			trailWidth: 1,
			from: {color: '#0fb9b1', a:0},
			to: {color: '#20bf6b', a:1},
			svgStyle: null,
			step: function(state, circle) {
				circle.path.setAttribute('stroke', state.color);
			}
		});

		$("#download-button").click(startDownloading)
		$("#stop-button").click(stopDownloading)

		var timestamp = Date.now().toString();
		//$("#output-directory-box").val(timestamp)
	}

	function showTinyTile(base64) {
		var currentImages = $(".tile-strip img");

		for(var i = 4; i < currentImages.length; i++) {
			$(currentImages[i]).remove();
		}

		var image = $("<img/>").attr('src', "data:image/png;base64, " + base64)

		var strip = $(".tile-strip");
		strip.prepend(image)
	}


	function finishRequests(numTiles) {
		if(completed_requests < numTiles) {
			console.log("Waiting for requests to finish ...")
			setTimeout(function() {
				finishRequests(numTiles);
			}, 1000);
		}
		else {
			console.log("Finished waiting for requests to finish!")
			$.ajax({
				url: "/end-download",
				async: false,
				timeout: 30 * 1000,
				type: "post",
				contentType: false,
				processData: false,
				dataType: 'json',
			});
			updateProgress(numTiles, numTiles);
			logItemRaw("All requests are done");
			$("#stop-button").html("FINISH");
		}
	}

	async function startDownloading() {


		// if(getCollection().features.length == 0) {
		// 	M.toast({html: 'You need to select a region first.', displayLength: 3000})
		// 	return;
		// }

		cancellationToken = false;
		requests = [];

		var timestamp = Date.now().toString();
		var allTiles = getAllGridTiles();

		var minInterRequestPeriodMilliseconds = 1000.0 / parseFloat($("#request-frequency-box").val());
		var outputDirectory = $("#output-directory-box").val();
		var outputFile = $("#output-file-box").val();
		var outputType = $("#output-type").val();
		var outputScale = $("#output-scale").val();
		var source = $("#source-box").val()

		tile_keys = [];
		for(var i = 0; i < allTiles.length; i++) {
			tile_keys.push({
				x: allTiles[i].x,
				y: allTiles[i].y,
				z: allTiles[i].z,
				quad: generateQuadKey(allTiles[i].x, allTiles[i].y, allTiles[i].z)
			});
		}
		var data1 = new FormData();
		data1.append('outputDirectory', outputDirectory)
		data1.append('outputFile', outputFile)
		data1.append('timestamp', timestamp)
		data1.append('outputType', outputType)
		data1.append('tiles', JSON.stringify(tile_keys));
		data1.append('outputScale', outputScale)

		var requiredTiles = [];
		$.ajax({
			url: "/init-download",
			async: false,
			timeout: 30 * 1000,
			type: "post",
			processData: false,
			contentType: false,
			data: data1,
			dataType: 'json',
		}).done(function(data) {
			required_tile_indices = data["required-tile-indices"];
			for (var i = 0; i < required_tile_indices.length; i++) {
				console.log("Tile index: " + required_tile_indices[i]);
				requiredTiles.push(allTiles[required_tile_indices[i]]);
			}
		}).fail(function(data, textStatus, errorThrown) {
			M.toast({html: 'An error occurred while checking for existing tiles', displayLength: 3000})
			return;
		});


		if (requiredTiles.length == 0) {
			M.toast({html: 'All tiles in the requested range already exist in the output folder.', displayLength: 3000})
			return;
		}

		$("#main-sidebar").hide();
		$("#download-sidebar").show();
		$(".tile-strip").html("");
		$("#stop-button").html("STOP");
		removeGrid();
		clearLogs();
		M.Toast.dismissAll();

		updateProgress(0, requiredTiles.length);

		var bounds = getBounds();
		var boundsArray = [bounds.getSouthWest().lng, bounds.getSouthWest().lat, bounds.getNorthEast().lng, bounds.getNorthEast().lat]
		var centerArray = [bounds.getCenter().lng, bounds.getCenter().lat, getMaxZoom()]

		var data = new FormData();
		data.append('minZoom', getMinZoom())
		data.append('maxZoom', getMaxZoom())
		data.append('outputDirectory', outputDirectory)
		data.append('outputFile', outputFile)
		data.append('outputType', outputType)
		data.append('outputScale', outputScale)
		data.append('source', source)
		data.append('timestamp', timestamp)
		data.append('bounds', boundsArray.join(","))
		data.append('center', centerArray.join(","))

		$.ajax({
			url: "/start-download",
			async: false,
			timeout: 30 * 1000,
			type: "post",
			contentType: false,
			processData: false,
			data: data,
			dataType: 'json',
		})

		// let i = 0;

		var start_time = new Date();
		completed_requests = 0;

		// Start making requests 500ms from now (allow for setup)
		var request_time = start_time.getMilliseconds() + 500;

		for ( const item of requiredTiles ) {
			setTimeout(function() {

				if(cancellationToken) {
					return;
				}

				var boxLayer = previewRect(item);

				var url = "/download-tile";

				var data = new FormData();
				data.append('x', item.x)
				data.append('y', item.y)
				data.append('z', item.z)
				data.append('quad', generateQuadKey(item.x, item.y, item.z))
				data.append('outputDirectory', outputDirectory)
				data.append('outputFile', outputFile)
				data.append('outputType', outputType)
				data.append('outputScale', outputScale)
				data.append('timestamp', timestamp)
				data.append('source', source)
				data.append('bounds', boundsArray.join(","))
				data.append('center', centerArray.join(","))

				$.ajax({
					url: url,
					async: false,
					timeout: 30 * 1000,
					type: "post",
					contentType: false,
					processData: false,
					data: data,
					dataType: 'json',
				}).done(function(data) {

					if(cancellationToken) {
						return;
					}

					if(data.code == 200) {
						showTinyTile(data.image)
						logItem(item.x, item.y, item.z, data.message);
					} else {
						logItem(item.x, item.y, item.z, data.code + " Error downloading tile");
					}

				}).fail(function(data, textStatus, errorThrown) {

					if(cancellationToken) {
						return;
					}

					logItem(item.x, item.y, item.z, "Error while relaying tile");

				}).always(function(data) {
					completed_requests += 1;
					removeLayer(boxLayer);
					updateProgress(completed_requests, requiredTiles.length);
					if(cancellationToken) {
						return;
					}
				});
			} , request_time);
			request_time += minInterRequestPeriodMilliseconds;
		}
		setTimeout(function() {
			finishRequests(requiredTiles.length);
		} , request_time);
	}

	function updateProgress(value, total) {
		const progress = value / total;
		const total_time_remaining_seconds = (1.0-progress) * total * (1.0 / parseFloat($("#request-frequency-box").val()));
		const time_remaining_hours = Math.floor(total_time_remaining_seconds / 3600.0);
		const time_remaining_minutes = Math.floor((total_time_remaining_seconds - time_remaining_hours * 3600.0) / 60.0);
		const time_remaining_seconds = Math.floor(total_time_remaining_seconds - time_remaining_hours * 3600.0 - time_remaining_minutes * 60);

		bar.animate(progress);
		bar.setText(Math.round(progress * 100) + '<span>%</span>');

		$("#progress-subtitle").html(value.toLocaleString() + " <span>out of</span> " + total.toLocaleString());
		var out = "<span>Approx:</span> ";
		if(time_remaining_hours > 0) {
			out += time_remaining_hours + " <span>hour(s) and</span> ";
			if (time_remaining_minutes > 0) {
				out += time_remaining_minutes + " <span>minute(s)</span> "
			}
		} else if(time_remaining_minutes > 0) {
			out += time_remaining_minutes + " <span>minute(s) and</span> ";
			if (time_remaining_seconds > 0) {
				out += time_remaining_seconds + " <span>second(s)</span> "
			}
		} else if (time_remaining_seconds > 0) {
			out += time_remaining_seconds + " <span>second(s)</span> "
		}
		else {
			out += "<span>less than a second</span>";
		}
		$("#progress-time-remaining").html(out);
	}

	function logItem(x, y, z, text) {
		logItemRaw(x + ',' + y + ',' + z + ' : ' + text)
	}

	function logItemRaw(text) {

		var logger = $('#log-view');
		logger.val(logger.val() + '\n' + text);

		logger.scrollTop(logger[0].scrollHeight);
	}

	function clearLogs() {
		var logger = $('#log-view');
		logger.val('');
	}

	function stopDownloading() {
		cancellationToken = true;

		for(var i =0 ; i < requests.length; i++) {
			var request = requests[i];
			try {
				request.abort();
			} catch(e) {

			}
		}

		$("#main-sidebar").show();
		$("#download-sidebar").hide();
		removeGrid();
		clearLogs();

	}

	initializeMaterialize();
	initializeSources();
	initializeMap();
	initializeSearch();
	initializePolygonTool();
	initializeGridPreview();
	initializeMoreOptions();
	initializeDownloader();

	function getKyushyuAndSurroundingIslandsFeatureCollection() {
		return {
			"type": "FeatureCollection",
			"features": [
				{
					"id": "67116b7cc3567d9301c8c2993ba1f409",
					"type": "Feature",
					"properties": {},
					"geometry": {
						"coordinates": [
							[
								[
									122.88199040892255,
									24.457797849070474
								],
								[
									122.94291337281152,
									24.362694356572803
								],
								[
									123.5608462928472,
									24.283386790204958
								],
								[
									123.68269222080863,
									23.973614874733173
								],
								[
									123.90897751545032,
									23.989518836397593
								],
								[
									124.77060229122549,
									24.15639165320792
								],
								[
									126.10220421747363,
									24.639878825846154
								],
								[
									128.10395874714328,
									26.024316308231647
								],
								[
									128.26932107780408,
									26.313329553364255
								],
								[
									128.36505716398096,
									26.71051924149515
								],
								[
									129.55740660126122,
									28.13194076965435
								],
								[
									130.03608703223728,
									28.154963628972695
								],
								[
									130.12311983791096,
									28.361946295513533
								],
								[
									131.0282610164772,
									30.304170187874092
								],
								[
									131.12399710274576,
									30.484341421477623
								],
								[
									132.00302843961913,
									30.499340679915264
								],
								[
									132.05524812300496,
									30.74649407495862
								],
								[
									131.5765676920289,
									30.9706301337132
								],
								[
									130.8541954052215,
									31.0228530875372
								],
								[
									129.9848590106531,
									34.21965526584421
								],
								[
									129.73246387431868,
									34.363464945170406
								],
								[
									129.4800687379842,
									34.406559824661116
								],
								[
									129.59321138525905,
									34.59304774096145
								],
								[
									129.56710154356608,
									34.736215814550405
								],
								[
									129.4974752990821,
									34.793413736928315
								],
								[
									129.3408162489245,
									34.771969160762026
								],
								[
									129.21026704045988,
									34.6431847041971
								],
								[
									129.04490470979914,
									34.12604707672331
								],
								[
									129.10582767368805,
									34.03954741920066
								],
								[
									129.57580482416103,
									33.887960600542186
								],
								[
									129.41044249350023,
									33.54046406743497
								],
								[
									129.04490470979914,
									33.373457760291586
								],
								[
									128.9056522207395,
									33.213411961774256
								],
								[
									128.87083909854329,
									33.01659141987756
								],
								[
									128.56622427882303,
									32.84858211097098
								],
								[
									128.45308163145637,
									32.69490395907178
								],
								[
									128.52270787594028,
									32.52628572528748
								],
								[
									128.81861941515757,
									32.44553009207125
								],
								[
									129.20156375995663,
									32.46021832426672
								],
								[
									129.66283762983466,
									32.53362355185433
								],
								[
									129.8369032410904,
									32.19546430215186
								],
								[
									129.6715409103378,
									31.929937763658998
								],
								[
									129.47136545738925,
									31.663642173861547
								],
								[
									129.558398263063,
									31.55245954056568
								],
								[
									130.09800165801983,
									31.210673499617997
								],
								[
									129.77598027710962,
									30.904992920315024
								],
								[
									129.74987043541665,
									30.7330844126858
								],
								[
									130.01096885234608,
									30.508394401153566
								],
								[
									129.71505731322054,
									30.057455439731527
								],
								[
									129.47136545738925,
									30.08758243187168
								],
								[
									129.28859656553868,
									29.876501113073815
								],
								[
									129.0187948681061,
									29.187405103692882
								],
								[
									128.84472925685048,
									28.799165991618978
								],
								[
									129.02749814870106,
									28.355875718402785
								],
								[
									128.7751030122747,
									27.91072668328053
								],
								[
									128.37475210637763,
									27.417393663849666
								],
								[
									127.91347823649954,
									27.169895468496904
								],
								[
									127.60016013618429,
									26.820921450846512
								],
								[
									127.182402669189,
									26.758768493927022
								],
								[
									126.59928287144118,
									26.470869469265025
								],
								[
									126.53835990746057,
									26.143190345358036
								],
								[
									126.89519441056672,
									25.657790066622255
								],
								[
									125.24157110350012,
									25.05219604109061
								],
								[
									123.82293637157835,
									24.601959486844947
								],
								[
									122.88298207072427,
									24.617784911958935
								],
								[
									122.88199040892255,
									24.457797849070474
								]
							]
						],
						"type": "Polygon"
					}
				}
			]
		}
	}

	function getFukuokaFeatureCollection() {
		return {
			"type": "FeatureCollection",
			"features": [
				{
					"id": "dcda47f3f0675783ce7c61c6064a9f2d",
					"type": "Feature",
					"properties": {},
					"geometry": {
						"coordinates": [
							[
								[
									131.00508300780706,
									33.98039415645994
								],
								[
									130.8828601074182,
									33.98039415645994
								],
								[
									130.85127441405928,
									33.94850254563103
								],
								[
									130.8320483398408,
									33.96103281875989
								],
								[
									130.75102416992013,
									33.95533746881077
								],
								[
									130.68098632812428,
									33.94736333839718
								],
								[
									130.64665405273416,
									33.91431969670137
								],
								[
									130.60270874023473,
									33.88924355596757
								],
								[
									130.567003173829,
									33.901782548245905
								],
								[
									130.52031127929843,
									33.89836300592371
								],
								[
									130.51344482422041,
									33.88240332860322
								],
								[
									130.49284545898632,
									33.86187935618119
								],
								[
									130.47087280273672,
									33.87442237020177
								],
								[
									130.4543933105494,
									33.86187935618119
								],
								[
									130.47087280273672,
									33.842491073639394
								],
								[
									130.4612597656274,
									33.823098390984484
								],
								[
									130.44066040039337,
									33.82880257786407
								],
								[
									130.42830078125291,
									33.81625286443639
								],
								[
									130.43516723633093,
									33.80484243598343
								],
								[
									130.4324206542998,
									33.78886527973586
								],
								[
									130.448900146487,
									33.77402667893652
								],
								[
									130.4543933105494,
									33.76032722740625
								],
								[
									130.43791381836212,
									33.731779670484414
								],
								[
									130.41456787109684,
									33.72949545545197
								],
								[
									130.4008349609408,
									33.70550752706586
								],
								[
									130.36238281250382,
									33.67922734536022
								],
								[
									130.3211840820357,
									33.69293974720881
								],
								[
									130.27861206055195,
									33.6940823486178
								],
								[
									130.2415332031306,
									33.7020801330701
								],
								[
									130.21681396484973,
									33.7020801330701
								],
								[
									130.1934680175844,
									33.66779867296218
								],
								[
									130.1783618164128,
									33.64722323571294
								],
								[
									130.14952270508508,
									33.636933672339495
								],
								[
									130.14540283203826,
									33.61291990973109
								],
								[
									130.1330432128978,
									33.60148243245031
								],
								[
									130.10695068360133,
									33.60834510090143
								],
								[
									130.0753649902424,
									33.58203523919052
								],
								[
									130.08635131836724,
									33.56143931553615
								],
								[
									130.1055773925857,
									33.5454168671569
								],
								[
									130.10969726563252,
									33.524812210492314
								],
								[
									130.07948486328917,
									33.51565300909141
								],
								[
									130.03828613282104,
									33.5064928378971
								],
								[
									130.02043334961814,
									33.46640568956022
								],
								[
									130.04240600586786,
									33.45151145244009
								],
								[
									130.10145751953883,
									33.459531744220854
								],
								[
									130.17973510742837,
									33.452657253826644
								],
								[
									130.24977294922428,
									33.46067743962995
								],
								[
									130.39122192383155,
									33.39076232202271
								],
								[
									130.42280761719053,
									33.38388238415257
								],
								[
									130.4543933105494,
									33.39534864477537
								],
								[
									130.4846057128927,
									33.42400767817543
								],
								[
									130.52305786132968,
									33.42629999232629
								],
								[
									130.5244311523453,
									33.37126775073391
								],
								[
									130.45988647461184,
									33.32652840126063
								],
								[
									130.40770141601877,
									33.28750611341074
								],
								[
									130.35139648437905,
									33.241575190184236
								],
								[
									130.3211840820357,
									33.201365825000536
								],
								[
									130.30333129883286,
									33.17033454792603
								],
								[
									130.3115710449265,
									33.143891829039404
								],
								[
									130.3637561035195,
									33.11744113896616
								],
								[
									130.37474243164428,
									33.09558455891077
								],
								[
									130.40632812500326,
									33.06796847796359
								],
								[
									130.38298217773792,
									33.00349724833369
								],
								[
									130.40632812500326,
									32.98852396760458
								],
								[
									130.49971191406433,
									32.989675848631165
								],
								[
									130.5299243164077,
									33.00119383206196
								],
								[
									130.52717773437644,
									33.019619478106605
								],
								[
									130.51344482422041,
									33.04609959877463
								],
								[
									130.54228393554814,
									33.05991215450966
								],
								[
									130.57524291992263,
									33.07947623212728
								],
								[
									130.58348266601627,
									33.10133681758185
								],
								[
									130.65489379882774,
									33.09558455891077
								],
								[
									130.6741198730462,
									33.11053964839665
								],
								[
									130.68235961913985,
									33.1415920854231
								],
								[
									130.72630493163922,
									33.13929228153525
								],
								[
									130.77162353515416,
									33.109389347254435
								],
								[
									130.8320483398408,
									33.090982480942245
								],
								[
									130.86363403319973,
									33.08983192380903
								],
								[
									130.87874023437138,
									33.12319196689691
								],
								[
									130.90208618163666,
									33.182978246919504
								],
								[
									130.86638061523092,
									33.230088685998425
								],
								[
									130.8828601074182,
									33.263395390380495
								],
								[
									130.87874023437138,
									33.29324578025145
								],
								[
									130.8622607421841,
									33.342591325667
								],
								[
									130.89521972655865,
									33.37241461119767
								],
								[
									130.9130725097615,
									33.43546864359226
								],
								[
									130.9405383300736,
									33.45151145244009
								],
								[
									130.9721240234325,
									33.488169586654266
								],
								[
									131.03666870116598,
									33.5030575237012
								],
								[
									131.12730590819592,
									33.489314903469264
								],
								[
									131.1808642578045,
									33.49275076303063
								],
								[
									131.20421020506978,
									33.5499950127754
								],
								[
									131.20421020506978,
									33.576314642178474
								],
								[
									131.19734374999177,
									33.61406357400226
								],
								[
									131.1808642578045,
									33.634646935713604
								],
								[
									131.11769287108666,
									33.64150696342833
								],
								[
									131.08336059569655,
									33.65865464157362
								],
								[
									131.0627612304625,
									33.6940823486178
								],
								[
									131.02705566405677,
									33.75005120164313
								],
								[
									131.01881591796308,
									33.794571749308346
								],
								[
									131.05452148436882,
									33.81739382357813
								],
								[
									131.04765502929075,
									33.8607389907972
								],
								[
									131.03623830286534,
									33.873888625427426
								],
								[
									131.0174936333433,
									33.86580567398751
								],
								[
									131.00255121996662,
									33.83561652464017
								],
								[
									131.01057617186945,
									33.90064271604308
								],
								[
									131.03804199218155,
									33.94736333839718
								],
								[
									131.00508300780706,
									33.98039415645994
								]
							]
						],
						"type": "Polygon"
					}
				}
			]
		}
	}

	function getFukuokaAndSurroundingPrefectureFeatureCollection() {
		return{
			"type": "FeatureCollection",
			"features": [
				{
					"id": "40deea5921d8087ca0bd3b625129ae40",
					"type": "Feature",
					"properties": {},
					"geometry": {
						"coordinates": [
							[
								[
									131.66073916933993,
									33.53028706229861
								],
								[
									131.15793560530466,
									32.85444217114481
								],
								[
									130.53725178444643,
									32.708882180804366
								],
								[
									129.76127295350972,
									32.95071041347427
								],
								[
									129.7716741526424,
									33.65135130071569
								],
								[
									130.39030242147845,
									33.946536363335696
								],
								[
									130.87990400752398,
									34.480466475708155
								],
								[
									131.65380503658486,
									34.47253956789828
								],
								[
									131.66073916933993,
									33.53028706229861
								]
							]
						],
						"type": "Polygon"
					}
				}
			]
		}
	}

	function getKyushyuFeatureCollection() {
		return{
				"type": "FeatureCollection",
				"features": [
					{
						"id": "8efef9d1a62fd77bd2dca96d83aedc67",
						"type": "Feature",
						"properties": {},
						"geometry": {
							"coordinates": [
								[
									[
										130.69014929799658,
										30.930298745455474
									],
									[
										130.0609883352995,
										30.950534978676586
									],
									[
										130.0609883352995,
										31.448334903922785
									],
									[
										130.03739479919597,
										31.976865711546125
									],
									[
										129.3374532282361,
										33.0446010532017
									],
									[
										129.32172420413525,
										33.544194684072224
									],
									[
										129.67562724564038,
										33.936583368876455
									],
									[
										130.22614308802423,
										33.917006600415434
									],
									[
										130.90249112288058,
										34.46993502434367
									],
									[
										131.7675874465652,
										34.741805075499556
									],
									[
										132.12149048807032,
										34.482901390627845
									],
									[
										132.498987065679,
										33.94963204795093
									],
									[
										132.33383231295426,
										33.68173483915841
									],
									[
										131.91701317518897,
										33.465501842603516
									],
									[
										132.239458168588,
										32.8928454793796
									],
									[
										131.4844650133706,
										31.27373083389361
									],
									[
										131.13842648386805,
										31.092068535984794
									],
									[
										130.69014929799658,
										30.930298745455474
									]
								]
							],
							"type": "Polygon"
						}
					}
				]
			}
	}

	function getJapanFeatureCollection() {
		return {
			"type": "FeatureCollection",
			"features": [
				{
					"id": "e490d9cdda513e0ce40e4c92a5134fa2",
					"type": "Feature",
					"properties": {},
					"geometry": {
						"coordinates": [
							[
								[
									141.93308552194776,
									45.60256487830242
								],
								[
									142.62819334743057,
									44.989421278978995
								],
								[
									143.69843872950156,
									44.211691505639095
								],
								[
									144.2721785220068,
									44.14047260074469
								],
								[
									144.4045800125749,
									43.98190043261985
								],
								[
									144.713516823879,
									43.94219103206163
								],
								[
									145.28725661638435,
									44.38542002427178
								],
								[
									145.44172502200388,
									44.36176004035184
								],
								[
									145.41965810695245,
									44.14047260074469
								],
								[
									145.14382166822548,
									43.7990174420753
								],
								[
									145.25415624374227,
									43.6395323384036
								],
								[
									145.3644908191941,
									43.31928886212387
								],
								[
									145.66239417297243,
									43.42355416611011
								],
								[
									145.86099640882463,
									43.38347333910485
								],
								[
									145.849962951299,
									43.28717117036072
								],
								[
									145.64032725792111,
									43.26307176666239
								],
								[
									145.5410261399299,
									43.1504817025274
								],
								[
									145.17692204086745,
									43.09410874662794
								],
								[
									145.07762092294138,
									42.965061245901296
								],
								[
									144.7907510267538,
									42.892352807513134
								],
								[
									144.39354655504934,
									42.908517655203354
								],
								[
									144.2501116068904,
									42.95698676894426
								],
								[
									143.98530862575416,
									42.85192214770137
								],
								[
									143.62120452669177,
									42.576291445989824
								],
								[
									143.38950191819742,
									42.291275771491485
								],
								[
									143.43363574836513,
									42.10327425806034
								],
								[
									143.33433463043906,
									41.94754692954126
								],
								[
									143.23503351251293,
									41.857214693745476
								],
								[
									142.94816361632525,
									42.021360054553554
								],
								[
									142.41855765398765,
									42.209604706992195
								],
								[
									142.10962084268368,
									42.3891414417229
								],
								[
									141.96618589458978,
									42.429873844284
								],
								[
									141.71241637097916,
									42.56003975772475
								],
								[
									141.48071376248492,
									42.511259289647
								],
								[
									141.05040891813843,
									42.274950018571275
								],
								[
									140.90697396997956,
									42.25862003543219
								],
								[
									140.80767285205354,
									42.40543757679421
								],
								[
									140.6752713614854,
									42.535654286616875
								],
								[
									140.47666912563312,
									42.511259289647
								],
								[
									140.35530109265568,
									42.299437061559814
								],
								[
									140.5759702435592,
									42.16055131497558
								],
								[
									140.75250556436004,
									42.19325780527538
								],
								[
									141.03937546054783,
									41.98036332760603
								],
								[
									141.27107806910698,
									41.83255645219023
								],
								[
									141.54691450776903,
									41.428460673475655
								],
								[
									141.46968030495924,
									41.17980570226891
								],
								[
									141.52484759265263,
									40.637803907800816
								],
								[
									141.73448328609555,
									40.52887076623105
								],
								[
									141.99928626723187,
									39.998453624704155
								],
								[
									142.12065430020937,
									39.514974099375536
								],
								[
									141.95515243699913,
									39.07951462228294
								],
								[
									141.61311525305314,
									38.71026086375474
								],
								[
									141.5800148804111,
									38.4515062894979
								],
								[
									141.69034945586287,
									38.23516602682824
								],
								[
									141.5358810502434,
									38.18314826245984
								],
								[
									141.3593457294424,
									38.3650477245198
								],
								[
									141.13867657847385,
									38.26116096620751
								],
								[
									140.99524163038006,
									38.05294128100124
								],
								[
									141.06144237566406,
									37.76566952604267
								],
								[
									141.11660966342248,
									37.459763327616386
								],
								[
									141.06144237566406,
									36.941250354476864
								],
								[
									140.8849070549283,
									36.81769116794614
								],
								[
									140.6752713614854,
									36.365895098550894
								],
								[
									140.62010407379194,
									36.223610796360376
								],
								[
									140.97317471526372,
									35.69669961828079
								],
								[
									140.8407732246955,
									35.598073668937246
								],
								[
									140.65320444643402,
									35.598073668937246
								],
								[
									140.48770258322384,
									35.427433226446325
								],
								[
									140.47666912563312,
									35.220383814281476
								],
								[
									140.37736800770693,
									35.094094378070565
								],
								[
									139.89189587566705,
									34.84092812753971
								],
								[
									139.72639401245692,
									34.90429301430872
								],
								[
									139.54985869165603,
									35.13922025250673
								],
								[
									139.46159103125564,
									35.25643048582039
								],
								[
									139.22988842276135,
									35.220383814281476
								],
								[
									139.15265421995161,
									35.048943516731825
								],
								[
									139.21885496523566,
									34.93143444062146
								],
								[
									139.1085203897839,
									34.695910854190316
								],
								[
									138.92095161145727,
									34.568811904811625
								],
								[
									138.75544974824714,
									34.568811904811625
								],
								[
									138.6671820878467,
									34.72312099785162
								],
								[
									138.72234937560512,
									35.00376768265552
								],
								[
									138.56788096992057,
									34.967609044673864
								],
								[
									138.41341256430104,
									34.84092812753971
								],
								[
									138.30307798878425,
									34.5415510904385
								],
								[
									137.96104080483826,
									34.57789685768971
								],
								[
									137.48660213025897,
									34.59606378481669
								],
								[
									137.04526382838685,
									34.532462167477306
								],
								[
									136.9790630831028,
									34.42331773255445
								],
								[
									136.96802962557712,
									34.25021401234645
								],
								[
									136.82459467741825,
									34.18634896470246
								],
								[
									136.6921931868501,
									34.23197179619321
								],
								[
									136.40532329059744,
									34.13156897852676
								],
								[
									136.36118946042973,
									34.0127571727528
								],
								[
									136.2618883425036,
									33.893778872244894
								],
								[
									136.0301857340093,
									33.62776719837976
								],
								[
									135.88675078591552,
									33.39778534712373
								],
								[
									135.64401471983058,
									33.406996352119194
								],
								[
									135.30197753588442,
									33.535847822919564
								],
								[
									135.18060950284206,
									33.71958859926929
								],
								[
									134.99304072451548,
									33.90293695388441
								],
								[
									135.02614109715745,
									34.23197179619321
								],
								[
									134.6951373707371,
									34.113301087264844
								],
								[
									134.79443848866327,
									33.82964476932429
								],
								[
									134.60686971040167,
									33.68287180427538
								],
								[
									134.39723401695875,
									33.51745220251131
								],
								[
									134.29793289903267,
									33.34249881714757
								],
								[
									134.2648325263907,
									33.17642861325476
								],
								[
									134.0772637481291,
									33.167193238473786
								],
								[
									133.86762805468618,
									33.37014647419615
								],
								[
									133.60282507354987,
									33.43462350722683
								],
								[
									133.33802209241355,
									33.305621616552415
								],
								[
									133.33802209241355,
									33.167193238473786
								],
								[
									133.21665405937108,
									33.04704487209035
								],
								[
									133.08425256880292,
									32.92673236977369
								],
								[
									133.117352941445,
									32.722753539928135
								],
								[
									132.9297841631834,
									32.62058864980479
								],
								[
									132.45534548860428,
									32.64846338617126
								],
								[
									132.36707782826875,
									33.00079024039553
								],
								[
									132.25674325275202,
									33.333280980086144
								],
								[
									131.98090681409002,
									33.26872881487411
								],
								[
									132.1243417621838,
									33.0840310962909
								],
								[
									132.15744213482583,
									32.935992997996394
								],
								[
									131.98090681409002,
									32.71347065121731
								],
								[
									131.81540495087984,
									32.4717768495365
								],
								[
									131.6499030876696,
									32.14539294670779
								],
								[
									131.76023766312136,
									32.070626043836356
								],
								[
									131.7271372904794,
									31.90217693028042
								],
								[
									131.55060196974347,
									31.817836498673827
								],
								[
									131.429233936701,
									31.36672149105408
								],
								[
									131.10926366780632,
									31.168673488999147
								],
								[
									130.64585845081785,
									30.922896463820805
								],
								[
									130.49139004513324,
									31.121457986464748
								],
								[
									130.226587063997,
									31.17811376735618
								],
								[
									130.0390182857355,
									31.42323021022284
								],
								[
									130.07211865837752,
									31.761566703654466
								],
								[
									130.09418557342883,
									32.03321964394415
								],
								[
									129.89558333757657,
									32.173414745755295
								],
								[
									129.89558333757657,
									32.55551384037878
								],
								[
									129.66388072908228,
									32.481084811104694
								],
								[
									129.4763119508208,
									32.81552925802046
								],
								[
									129.48734540834647,
									33.11176056130344
								],
								[
									129.28874317249426,
									33.07478599757029
								],
								[
									129.3108100876106,
									33.38857336573754
								],
								[
									129.50941232346275,
									33.591011197756146
								],
								[
									129.82938259229252,
									33.65532391196298
								],
								[
									130.09418557342883,
									33.783805214725064
								],
								[
									130.38105546968154,
									33.93040529646481
								],
								[
									130.7892933989766,
									34.02190245704534
								],
								[
									130.7341261112182,
									34.29580225282979
								],
								[
									130.8885945169028,
									34.45971507359846
								],
								[
									131.10926366780632,
									34.51428134494148
								],
								[
									131.34096627630055,
									34.51428134494148
								],
								[
									131.5837023423856,
									34.73218905641633
								],
								[
									131.87057223857317,
									34.84998324392919
								],
								[
									132.13537521970954,
									35.067006858785106
								],
								[
									132.36707782826875,
									35.247420319922526
								],
								[
									132.51051277636265,
									35.44541245241396
								],
								[
									132.6870480970984,
									35.54422639899511
								],
								[
									133.19458714431977,
									35.6608497248867
								],
								[
									133.52559087074013,
									35.598073668937246
								],
								[
									134.17656486605517,
									35.60704469473784
								],
								[
									134.4855016773592,
									35.71461852445083
								],
								[
									134.84960577642164,
									35.71461852445083
								],
								[
									135.20267641795846,
									35.83099319018413
								],
								[
									135.35714482364295,
									35.83993803163753
								],
								[
									135.40127865381066,
									35.723576467000115
								],
								[
									135.55574705949516,
									35.598073668937246
								],
								[
									135.85365041327356,
									35.71461852445083
								],
								[
									135.89778424344115,
									35.857824688878026
								],
								[
									135.79848312551513,
									36.000772621558625
								],
								[
									136.04121919153505,
									36.28589210864017
								],
								[
									136.5377247811656,
									36.69393219515277
								],
								[
									136.65909281420807,
									36.99414307012346
								],
								[
									136.58185861139827,
									37.17897795380499
								],
								[
									136.67012627173364,
									37.398431184950425
								],
								[
									136.94596271046078,
									37.52104520751432
								],
								[
									137.31006680952316,
									37.62598283789468
								],
								[
									137.45350175761695,
									37.53854508006398
								],
								[
									137.40936792744924,
									37.398431184950425
								],
								[
									137.243866064239,
									37.23170509237569
								],
								[
									137.16663186142927,
									37.14380606668304
								],
								[
									137.14456494631298,
									36.95888534307929
								],
								[
									137.1555984038386,
									36.84418496385089
								],
								[
									137.31006680952316,
									36.923611283497436
								],
								[
									137.45350175761695,
									37.04699902461404
								],
								[
									137.78450548403737,
									37.11741641308571
								],
								[
									138.04930846517362,
									37.258054845074085
								],
								[
									138.35824527654268,
									37.38089848775883
								],
								[
									138.55684751239488,
									37.56478718973726
								],
								[
									138.75544974824714,
									37.86155138781655
								],
								[
									138.76648320577283,
									38.105051932522514
								],
								[
									139.2960891680454,
									38.13977173315476
								],
								[
									139.32918954068737,
									38.35639617984529
								],
								[
									139.4946914038976,
									38.71026086375474
								],
								[
									139.64915980958216,
									38.81350151252019
								],
								[
									139.78156130015032,
									39.276233614014956
								],
								[
									139.89189587566705,
									39.387179012799976
								],
								[
									139.92499624830913,
									39.79529699759428
								],
								[
									139.77052784262463,
									39.80377387849049
								],
								[
									139.59399252182374,
									39.92234046765816
								],
								[
									139.61605943694013,
									40.04914865252371
								],
								[
									139.79259475774109,
									40.066038623436555
								],
								[
									139.90292933319273,
									40.20943430089241
								],
								[
									139.85879550302502,
									40.41135981048194
								],
								[
									139.759494385099,
									40.6126812377025
								],
								[
									139.98016353600246,
									40.80504679936678
								],
								[
									140.13463194168696,
									40.830096982944696
								],
								[
									140.26703343225518,
									41.030157787145924
								],
								[
									140.17876577185467,
									41.13827104671634
								],
								[
									140.31116726242294,
									41.3456810424062
								],
								[
									140.02429736623526,
									41.378805541724546
								],
								[
									139.88086241807645,
									41.568944107503484
								],
								[
									139.93602970583476,
									41.76675468553893
								],
								[
									140.035330823761,
									41.93934018910693
								],
								[
									139.90292933319273,
									42.06233036602609
								],
								[
									139.73742746998255,
									42.20143178478
								],
								[
									139.64915980958216,
									42.33207164511913
								],
								[
									139.72639401245692,
									42.429873844284
								],
								[
									139.72639401245692,
									42.62502110454528
								],
								[
									139.84776204543437,
									42.76288147533268
								],
								[
									140.02429736623526,
									42.77098137798117
								],
								[
									140.14566539921265,
									42.900435761122935
								],
								[
									140.2559999747295,
									42.892352807513134
								],
								[
									140.37736800770693,
									43.02155291237807
								],
								[
									140.20083268697113,
									43.20680271135717
								],
								[
									140.2559999747295,
									43.367433583525525
								],
								[
									140.4987360407494,
									43.43156714933855
								],
								[
									140.80767285205354,
									43.279139096222025
								],
								[
									140.96214125773804,
									43.31928886212387
								],
								[
									141.1607434935902,
									43.238962819316725
								],
								[
									141.30417844174906,
									43.3433659954415
								],
								[
									141.2269442388743,
									43.479622772020235
								],
								[
									141.20487732382298,
									43.71135316897144
								],
								[
									141.2931449841584,
									43.886553282982106
								],
								[
									141.50278067760132,
									43.934245966997906
								],
								[
									141.50278067760132,
									44.30651623823039
								],
								[
									141.61311525305314,
									44.42483208845812
								],
								[
									141.67931599833713,
									44.66074682549785
								],
								[
									141.56898142288537,
									44.96600667937665
								],
								[
									141.4476133898429,
									45.23081228175977
								],
								[
									141.37037918703317,
									45.55622964269364
								],
								[
									141.72344982850484,
									45.54850338592391
								],
								[
									141.93308552194776,
									45.60256487830242
								]
							]
						],
						"type": "Polygon"
					}
				}
			]
		}
	}
});
