'use strict';

// Sliding-window limiter. State is held in memory, per process: under NodeBB
// cluster/multi-worker setups the effective cap is (workers x max).
exports.createLimiter = ({ windowMs, getMax }) => {
	const timestamps = [];
	return {
		// returns true and records the call if under the limit, false otherwise (never throws)
		tryAcquire() {
			const now = Date.now();
			// timestamps are chronological, so drop expired entries from the front
			while (timestamps.length && now - timestamps[0] >= windowMs) {
				timestamps.shift();
			}
			if (timestamps.length >= getMax()) {
				return false;
			}
			timestamps.push(now);
			return true;
		},
	};
};
