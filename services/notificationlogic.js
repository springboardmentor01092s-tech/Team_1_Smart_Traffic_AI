// TrafficVision AI
// Alert Notification Service
// Rule-based congestion and accident notification logic


// Generate current timestamp
function getTimestamp() {
    return new Date().toISOString();
}


// Generate congestion notification
function generateCongestionNotification(congestionResult) {

    const timestamp = getTimestamp();

    if (congestionResult.congestionLevel === "HIGH") {
        return {
            type: "CONGESTION",
            severity: "HIGH",
            locationId: congestionResult.locationId,
            timestamp: timestamp,
            message: "Heavy congestion detected. Please consider an alternate route.",
            notification: true
        };
    }

    if (congestionResult.congestionLevel === "MEDIUM") {
        return {
            type: "CONGESTION",
            severity: "MEDIUM",
            locationId: congestionResult.locationId,
            timestamp: timestamp,
            message: "Moderate congestion detected. Expect some delay.",
            notification: true
        };
    }

    return {
        type: "CONGESTION",
        severity: "LOW",
        locationId: congestionResult.locationId,
        timestamp: timestamp,
        message: "Traffic is normal.",
        notification: false
    };
}


// Generate accident notification
function generateAccidentNotification(accidentData) {

    const timestamp = getTimestamp();

    if (accidentData.accidentDetected === true) {
        return {
            type: "ACCIDENT",
            severity: "CRITICAL",
            locationId: accidentData.locationId,
            timestamp: timestamp,
            message: "Accident detected. Please avoid this route.",
            notification: true
        };
    }

    return {
        type: "ACCIDENT",
        severity: "LOW",
        locationId: accidentData.locationId,
        timestamp: timestamp,
        message: "No accident reported.",
        notification: false
    };
}


// Export notification functions
module.exports = {
    generateCongestionNotification,
    generateAccidentNotification
};