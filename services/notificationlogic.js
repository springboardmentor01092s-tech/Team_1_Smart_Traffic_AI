// TrafficVision AI
// Congestion and Accident Notification Logic

// Generate notification based on congestion level
function generateCongestionNotification(congestionResult) {

    if (congestionResult.congestionLevel === "HIGH") {
        return {
            type: "CONGESTION",
            severity: "HIGH",
            locationId: congestionResult.locationId,
            message: "Heavy congestion detected. Please consider an alternate route.",
            notification: true
        };
    }

    if (congestionResult.congestionLevel === "MEDIUM") {
        return {
            type: "CONGESTION",
            severity: "MEDIUM",
            locationId: congestionResult.locationId,
            message: "Moderate congestion detected. Expect some delay.",
            notification: true
        };
    }

    return {
        type: "CONGESTION",
        severity: "LOW",
        locationId: congestionResult.locationId,
        message: "Traffic is normal.",
        notification: false
    };
}


// Generate notification when an accident is detected
function generateAccidentNotification(accidentData) {

    if (accidentData.accidentDetected === true) {
        return {
            type: "ACCIDENT",
            severity: "CRITICAL",
            locationId: accidentData.locationId,
            message: "Accident detected. Please avoid this route.",
            notification: true
        };
    }

    return {
        type: "ACCIDENT",
        severity: "LOW",
        locationId: accidentData.locationId,
        message: "No accident reported.",
        notification: false
    };
}


module.exports = {
    generateCongestionNotification,
    generateAccidentNotification
};