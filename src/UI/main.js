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
			style: 'mapbox://styles/mapbox/light-v10',
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

		map.on('draw.create', function (e) {
			M.Toast.dismissAll();
		});

		$("#boundary-draw-button").click(function() {
			startDrawing();
		})

	}

	function startDrawing() {
		removeGrid();
		draw.deleteAll();
		draw.changeMode('draw_polygon');

		M.Toast.dismissAll();
		M.toast({html: 'Select an area to download', displayLength: 7000})
	}

	function initializeGridPreview() {
		$("#grid-preview-button").click(previewGrid);

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

		// var areaPolygon = draw.getAll().features[0];
		var areaPolygon = getJapanFeatureCollection().features[0];

		if(turf.booleanDisjoint(polygon, areaPolygon) == false) {
			return true;
		}

		return false;
	}

	function getBounds() {
		// var coordinates = draw.getAll().features[0].geometry.coordinates[0];
		var coordinates = getJapanFeatureCollection().features[0].geometry.coordinates[0];
		// Zoom 0-12 with getJapanFeatureCollection - 11353 (about 2 hours)
		// Zoom 0-13 with getJapanFeatureCollection - 43253 (About 8 hours)

		// console.log(draw.All())

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


		// if(draw.getAll().features.length == 0) {
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
