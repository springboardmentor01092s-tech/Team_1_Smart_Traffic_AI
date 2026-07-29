import { Link } from "react-router-dom";

function Sidebar() {
  return (
    <div style={styles.sidebar}>
      <h2 style={styles.logo}>🚦 TrafficVision</h2>

      <nav style={styles.menu}>
        <Link to="/dashboard" style={styles.link}>
          🏠 Dashboard
        </Link>

        <Link to="/live-traffic" style={styles.link}>
          🚗 Live Traffic
        </Link>

        <Link to="/prediction" style={styles.link}>
          📈 Prediction
        </Link>

        <Link to="/alerts" style={styles.link}>
          ⚠ Alerts
        </Link>

        <Link to="/analytics" style={styles.link}>
          📊 Analytics
        </Link>

        <Link to="/profile" style={styles.link}>
          👤 Profile
        </Link>

        <Link to="/settings" style={styles.link}>
          ⚙ Settings
        </Link>
      </nav>
    </div>
  );
}

const styles = {
  sidebar: {
    width: "250px",
    height: "100vh",
    backgroundColor: "#1E3A8A",
    color: "white",
    padding: "20px",
    boxSizing: "border-box",
  },

  logo: {
    textAlign: "center",
    marginBottom: "30px",
    fontSize: "28px",
  },

  menu: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
    marginTop: "20px",
  },

  link: {
    color: "white",
    textDecoration: "none",
    fontSize: "20px",
    padding: "10px",
    borderRadius: "8px",
    transition: "0.3s",
  },
};

export default Sidebar;