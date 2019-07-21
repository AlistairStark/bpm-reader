import main from './scss/main.scss';
import $ from 'jquery';

const $filefield = $('#uploadFile');

let file = {};
const context = new AudioContext();
const reader = new FileReader();
let offlineContext = {};

$filefield.on('change', e => {
	const thisFile = e.currentTarget.files[0];
	reader.readAsArrayBuffer(thisFile);
	reader.onload = (e => {
		const encodedBuffer = e.currentTarget.result;
		context.decodeAudioData(encodedBuffer, (res) => {
			prepare(res);
			prepareHigh(res);
		});
	});
});

// function handleAudioData(data) {
// 	offlineContext = new OfflineAudioContext(1, data.length, data.sampleRate);
// 	offlineContext.startRendering()
// 		.then(result => {
// 			console.log('result is ', result);
// 		}).catch(err => {
// 			console.log('error rendering buffer');
// 		});
// 	const source = offlineContext.createBufferSource();
// 	source.buffer = data;
// 	// source.connect(context.destination);
// 	// source.start(0);
// }

$('#play').on('click', () => {
	console.log('HELLO');
});

function prepare(buffer) {
	var offlineContext = new OfflineAudioContext(1, buffer.length, buffer.sampleRate);
	var source = offlineContext.createBufferSource();
	source.buffer = buffer;
	var filter = offlineContext.createBiquadFilter();
	filter.type = 'lowpass';
	source.connect(filter);
	filter.connect(offlineContext.destination);
	source.start(0);
	offlineContext.startRendering();
	offlineContext.oncomplete = function (e) {
		process(e);
	};
}

function prepareHigh(buffer) {
	var offlineContext = new OfflineAudioContext(1, buffer.length, buffer.sampleRate);
	var source = offlineContext.createBufferSource();
	source.buffer = buffer;
	var filter = offlineContext.createBiquadFilter();
	filter.type = 'highpass';
	source.connect(filter);
	filter.connect(offlineContext.destination);
	source.start(0);
	offlineContext.startRendering();
	offlineContext.oncomplete = function (e) {
		process(e);
	};
}


function process(e) {
	var filteredBuffer = e.renderedBuffer;
	//If you want to analyze both channels, use the other channel later
	var data = filteredBuffer.getChannelData(0);
	var max = arrayMax(data);
	var min = arrayMin(data);
	console.log('max: ', max);
	console.log('min: ', min);
	var threshold = min + (max - min) * 0.6;
	console.log('threshold: ', threshold);
	var peaks = getPeaksAtThreshold(data, threshold);
	console.log('peaks are ', peaks);
	var intervalCounts = countIntervalsBetweenNearbyPeaks(peaks);
	console.log('intervals are ', intervalCounts);
	var tempoCounts = groupNeighborsByTempo(intervalCounts);
	console.log('tempos are ', tempoCounts);
	tempoCounts.sort(function (a, b) {
		return b.count - a.count;
	});
	if (tempoCounts.length) {
		console.log(tempoCounts[0].tempo);
		// output.innerHTML = tempoCounts[0].tempo;
	}
}

function getPeaksAtThreshold(data, threshold) {
	var peaksArray = [];
	var length = data.length;
	for (var i = 0; i < length;) {
		if (data[i] > threshold) {
			peaksArray.push(i);
			i += 10000;
		}
		i++;
	}
	return peaksArray;
}

function countIntervalsBetweenNearbyPeaks(peaks) {
	var intervalCounts = [];
	peaks.forEach(function (peak, index) {
		for (var i = 0; i < 10; i++) {
			var interval = peaks[index + i] - peak;
			var foundInterval = intervalCounts.some(function (intervalCount) {
				if (intervalCount.interval === interval) return intervalCount.count++;
			});
			//Additional checks to avoid infinite loops in later processing
			if (!isNaN(interval) && interval !== 0 && !foundInterval) {
				intervalCounts.push({
					interval: interval,
					count: 1
				});
			}
		}
	});
	return intervalCounts;
}

function groupNeighborsByTempo(intervalCounts) {
	var tempoCounts = [];
	intervalCounts.forEach(function (intervalCount) {
		//Convert an interval to tempo
		var theoreticalTempo = 60 / (intervalCount.interval / 44100);
		theoreticalTempo = Math.round(theoreticalTempo);
		if (theoreticalTempo === 0) {
			return;
		}
		// Adjust the tempo to fit within the 90-180 BPM range
		while (theoreticalTempo < 90) theoreticalTempo *= 2;
		while (theoreticalTempo > 180) theoreticalTempo /= 2;

		var foundTempo = tempoCounts.some(function (tempoCount) {
			if (tempoCount.tempo === theoreticalTempo) return tempoCount.count += intervalCount.count;
		});
		if (!foundTempo) {
			tempoCounts.push({
				tempo: theoreticalTempo,
				count: intervalCount.count
			});
		}
	});
	return tempoCounts;
}

function arrayMin(arr) {
	var len = arr.length,
		min = Infinity;
	while (len--) {
		if (arr[len] < min) {
			min = arr[len];
		}
	}
	return min;
}

function arrayMax(arr) {
	var len = arr.length,
		max = -Infinity;
	while (len--) {
		if (arr[len] > max) {
			max = arr[len];
		}
	}
	return max;
}