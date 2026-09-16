// TrafficVision AI
// Congestion Forecasting - Simple Rule-Based Logic

const WEIGHTS = {
    density: 0.6,
    speed: 0.4
};

const THRESHOLDS = {
    low: 0.4,
    medium: 0.7
};

// Calculate congestion score
function calculateCongestionScore(vehicleCount, roadCapacity, averageSpeed, speedLimit) {

    const density = Math.min(vehicleCount / roadCapacity, 1);

    const speedFactor = Math.min(
        Math.max(1 - averageSpeed / speedLimit, 0),
        1
    );

    const score =
        (density * WEIGHTS.density) +
        (speedFactor * WEIGHTS.speed);

    return Math.round(score * 100) / 100;
}

// Classify congestion level
function classifyCongestion(score) {

    if (score < THRESHOLDS.low) {
        return "LOW";
    }

    if (score < THRESHOLDS.medium) {
        return "MEDIUM";
    }

    return "HIGH";
}

// Decide the action
function decideAction(level) {

    if (level === "HIGH") {
        return {
            alert: true,
            alternateRoute: true,
            message: "Heavy congestion detected"
        };
    }

    if (level === "MEDIUM") {
        return {
            alert: false,
            alternateRoute: false,
            message: "Moderate traffic - plan ahead"
        };
    }

    return {
        alert: false,
        alternateRoute: false,
        message: "Traffic flowing normally"
    };
}

// Main congestion forecasting workflow
function forecastCongestion(input) {

    const {
        locationId,
        vehicleCount,
        roadCapacity,
        averageSpeed,
        speedLimit
    } = input;

    const score = calculateCongestionScore(
        vehicleCount,
        roadCapacity,
        averageSpeed,
        speedLimit
    );

    const level = classifyCongestion(score);

    const action = decideAction(level);

    return {
        locationId: locationId,
        congestionScore: score,
        congestionLevel: level,
        alert: action.alert,
        alternateRoute: action.alternateRoute,
        message: action.message
    };
}

module.exports = {
    calculateCongestionScore,
    classifyCongestion,
    decideAction,
    forecastCongestion
};